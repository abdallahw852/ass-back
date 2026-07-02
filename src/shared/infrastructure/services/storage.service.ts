import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectStorageClient, models } from 'oci-objectstorage';
import { SimpleAuthenticationDetailsProvider, Region } from 'oci-common';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  static readonly EMAIL_EXPIRES_IN = 7 * 24 * 3600;
  private static readonly DEFAULT_MIME_TYPE = 'application/octet-stream';

  private readonly client: ObjectStorageClient | null = null;
  private readonly namespace: string;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    this.namespace = this.config.get<string>('OCI_NAMESPACE', '');
    this.bucket = this.config.get<string>('OCI_BUCKET', '');
    this.region = this.config.get<string>('OCI_REGION', 'me-jeddah-1');

    const tenancy =
      this.config.get<string>('OCI_TENANCY_OCID', '') ||
      this.config.get<string>('OCI_TENANCY', '');
    const user =
      this.config.get<string>('OCI_USER_OCID', '') ||
      this.config.get<string>('OCI_USER', '');
    const fingerprint = this.config.get<string>('OCI_FINGERPRINT', '');
    const privateKey = this.config
      .get<string>('OCI_PRIVATE_KEY', '')
      .replace(/\\n/g, '\n');
    const hasValidOciCredentials =
      tenancy &&
      user &&
      fingerprint &&
      privateKey.includes('BEGIN') &&
      !privateKey.includes('...') &&
      this.region;

    if (hasValidOciCredentials) {
      try {
        const provider = new SimpleAuthenticationDetailsProvider(
          tenancy,
          user,
          fingerprint,
          privateKey,
          null,
          Region.fromRegionId(this.region),
        );
        this.client = new ObjectStorageClient({
          authenticationDetailsProvider: provider,
        });
      } catch (err) {
        this.logger.error(
          'Failed to initialize OCI Object Storage client',
          err,
        );
      }
    } else {
      this.logger.warn(
        'OCI Object Storage configuration is incomplete. Uploads to OCI will fail.',
      );
    }
  }

  async upload(params: {
    buffer: Buffer;
    key: string;
    mimeType: string;
  }): Promise<string> {
    if (!this.client) throw new Error('OCI client is not initialized');

    await this.client.putObject({
      namespaceName: this.namespace,
      bucketName: this.bucket,
      objectName: params.key,
      putObjectBody: params.buffer,
      contentLength: params.buffer.length,
      contentType: params.mimeType,
    });

    return this.buildObjectUrl(params.key);
  }

  async storeFile(params: {
    buffer: Buffer;
    originalName?: string;
    mimeType?: string;
    destinationDir?: string;
  }): Promise<string> {
    const destinationDir = params.destinationDir ?? 'uploads';
    const extension = this.resolveExtension(params);
    const filename = `${randomUUID()}${extension}`;

    if (this.client) {
      return this.upload({
        buffer: params.buffer,
        key: this.buildObjectKey(destinationDir, filename),
        mimeType: params.mimeType ?? StorageService.DEFAULT_MIME_TYPE,
      });
    }

    return this.storeLocalFile({
      ...params,
      destinationDir,
      originalName: filename,
    });
  }

  async getSignedUrl(params: {
    url: string;
    expiresIn?: number;
  }): Promise<string> {
    const { url, expiresIn = 3600 } = params;

    const prefix = this.buildObjectUrl('');
    if (!url.startsWith(prefix) || !this.client) return url;

    const key = url.slice(prefix.length);
    const timeExpires = new Date(Date.now() + expiresIn * 1000);

    const response = await this.client.createPreauthenticatedRequest({
      namespaceName: this.namespace,
      bucketName: this.bucket,
      createPreauthenticatedRequestDetails: {
        name: `par-${randomUUID()}`,
        objectName: key,
        accessType:
          models.CreatePreauthenticatedRequestDetails.AccessType.ObjectRead,
        timeExpires,
      },
    });

    const accessUri = response.preauthenticatedRequest.accessUri;
    return `https://objectstorage.${this.region}.oraclecloud.com${accessUri}`;
  }

  private static readonly MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      '.docx',
    'video/mp4': '.mp4',
  };

  async storeLocalFile(params: {
    buffer: Buffer;
    originalName?: string;
    mimeType?: string;
    destinationDir?: string;
  }): Promise<string> {
    const destinationDir = params.destinationDir ?? 'uploads';
    const extension = this.resolveExtension(params);
    const filename = `${randomUUID()}${extension}`;
    await mkdir(destinationDir, { recursive: true });
    const absolutePath = join(destinationDir, filename);
    await writeFile(absolutePath, params.buffer);
    return `/${destinationDir}/${filename}`;
  }

  private resolveExtension(params: {
    originalName?: string;
    mimeType?: string;
  }): string {
    return (
      extname(params.originalName ?? '') ||
      (params.mimeType
        ? (StorageService.MIME_TO_EXT[params.mimeType] ?? '.bin')
        : '.bin')
    );
  }

  private buildObjectKey(destinationDir: string, filename: string): string {
    return `${destinationDir.replace(/^\/+|\/+$/g, '')}/${filename}`;
  }

  private buildObjectUrl(key: string): string {
    return `https://objectstorage.${this.region}.oraclecloud.com/n/${this.namespace}/b/${this.bucket}/o/${key}`;
  }
}
