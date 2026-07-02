import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

const mockPutObject = jest.fn().mockResolvedValue({});
const mockCreatePreauthenticatedRequest = jest.fn().mockResolvedValue({
  preauthenticatedRequest: {
    accessUri:
      '/p/TEST_TOKEN/n/testnamespace/b/testbucket/o/avatars%2Fuser-123%2Fimage.jpg',
  },
});

jest.mock('oci-objectstorage', () => ({
  ObjectStorageClient: jest.fn().mockImplementation(() => ({
    putObject: mockPutObject,
    createPreauthenticatedRequest: mockCreatePreauthenticatedRequest,
  })),
  models: {
    CreatePreauthenticatedRequestDetails: {
      AccessType: { ObjectRead: 'ObjectRead' },
    },
  },
}));

jest.mock('oci-common', () => ({
  SimpleAuthenticationDetailsProvider: jest.fn().mockImplementation(() => ({})),
  Region: {
    fromRegionId: jest.fn().mockReturnValue({}),
  },
}));

describe('StorageService', () => {
  let service: StorageService;

  const mockNamespace = 'testnamespace';
  const mockBucket = 'testbucket';
  const mockRegion = 'me-jeddah-1';
  const createService = async (overrides: Record<string, string> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                OCI_TENANCY_OCID: 'ocid1.tenancy.oc1..test',
                OCI_USER_OCID: 'ocid1.user.oc1..test',
                OCI_FINGERPRINT: 'aa:bb:cc:dd',
                OCI_PRIVATE_KEY:
                  '-----BEGIN RSA PRIVATE KEY-----\\nfake\\n-----END RSA PRIVATE KEY-----',
                OCI_NAMESPACE: mockNamespace,
                OCI_BUCKET: mockBucket,
                OCI_REGION: mockRegion,
                ...overrides,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    return module.get<StorageService>(StorageService);
  };

  beforeEach(async () => {
    mockPutObject.mockClear();
    mockCreatePreauthenticatedRequest.mockClear();
    service = await createService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload object to OCI and return the object URL', async () => {
      const inputBuffer = Buffer.from('test-file-content');
      const inputKey = 'avatars/user-123/image.jpg';
      const inputMimeType = 'image/jpeg';

      const actualUrl = await service.upload({
        buffer: inputBuffer,
        key: inputKey,
        mimeType: inputMimeType,
      });

      const expectedUrl = `https://objectstorage.${mockRegion}.oraclecloud.com/n/${mockNamespace}/b/${mockBucket}/o/${inputKey}`;
      expect(actualUrl).toBe(expectedUrl);
      expect(mockPutObject).toHaveBeenCalledTimes(1);
      expect(mockPutObject).toHaveBeenCalledWith(
        expect.objectContaining({
          namespaceName: mockNamespace,
          bucketName: mockBucket,
          objectName: inputKey,
          putObjectBody: inputBuffer,
          contentType: inputMimeType,
        }),
      );
    });

    it('should propagate OCI errors', async () => {
      mockPutObject.mockRejectedValueOnce(new Error('OCI upload failed'));
      await expect(
        service.upload({
          buffer: Buffer.from('test'),
          key: 'test/key.png',
          mimeType: 'image/png',
        }),
      ).rejects.toThrow('OCI upload failed');
    });
  });

  describe('getSignedUrl', () => {
    it('should create a PAR and return a full signed URL', async () => {
      const inputKey = 'avatars/user-123/image.jpg';
      const inputUrl = `https://objectstorage.${mockRegion}.oraclecloud.com/n/${mockNamespace}/b/${mockBucket}/o/${inputKey}`;

      const actualUrl = await service.getSignedUrl({ url: inputUrl });

      expect(actualUrl).toBe(
        `https://objectstorage.${mockRegion}.oraclecloud.com/p/TEST_TOKEN/n/testnamespace/b/testbucket/o/avatars%2Fuser-123%2Fimage.jpg`,
      );
      expect(mockCreatePreauthenticatedRequest).toHaveBeenCalledTimes(1);
      expect(mockCreatePreauthenticatedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          namespaceName: mockNamespace,
          bucketName: mockBucket,
          createPreauthenticatedRequestDetails: expect.objectContaining({
            objectName: inputKey,
            accessType: 'ObjectRead',
          }) as unknown,
        }),
      );
    });

    it('should use custom expiresIn when provided', async () => {
      const inputUrl = `https://objectstorage.${mockRegion}.oraclecloud.com/n/${mockNamespace}/b/${mockBucket}/o/test/key.png`;

      jest.useFakeTimers({ now: 1000000000000 });
      await service.getSignedUrl({ url: inputUrl, expiresIn: 604800 });
      jest.useRealTimers();

      expect(mockCreatePreauthenticatedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          createPreauthenticatedRequestDetails: expect.objectContaining({
            timeExpires: new Date(1000000000000 + 604800 * 1000),
          }) as unknown,
        }),
      );
    });

    it('should return the original URL unchanged for non-OCI URLs', async () => {
      const inputUrl = 'https://cdn.example.com/icons/phone.png';
      const actualUrl = await service.getSignedUrl({ url: inputUrl });
      expect(actualUrl).toBe(inputUrl);
      expect(mockCreatePreauthenticatedRequest).not.toHaveBeenCalled();
    });

    it('should return the original URL unchanged for external URLs', async () => {
      const inputUrl = 'https://example.com/image.png';
      const actualUrl = await service.getSignedUrl({ url: inputUrl });
      expect(actualUrl).toBe(inputUrl);
      expect(mockCreatePreauthenticatedRequest).not.toHaveBeenCalled();
    });

    it('should expose EMAIL_EXPIRES_IN constant for email use cases', () => {
      expect(StorageService.EMAIL_EXPIRES_IN).toBe(7 * 24 * 3600);
    });
  });

  describe('storeFile', () => {
    it('should upload files to OCI when OCI is configured', async () => {
      const uploadSpy = jest
        .spyOn(service, 'upload')
        .mockResolvedValue('https://objectstorage.example.com/test.pdf');
      const storeLocalFileSpy = jest.spyOn(service, 'storeLocalFile');

      const actualUrl = await service.storeFile({
        buffer: Buffer.from('document'),
        originalName: 'catalog.pdf',
        mimeType: 'application/pdf',
        destinationDir: 'uploads/products/digital',
      });

      expect(actualUrl).toBe('https://objectstorage.example.com/test.pdf');
      expect(uploadSpy).toHaveBeenCalledTimes(1);
      const [uploadParams] = uploadSpy.mock.calls[0] as [
        { buffer: Buffer; key: string; mimeType: string },
      ];
      expect(uploadParams.buffer).toBeInstanceOf(Buffer);
      expect(uploadParams.mimeType).toBe('application/pdf');
      expect(uploadParams.key).toMatch(/^uploads\/products\/digital\/.+\.pdf$/);
      expect(storeLocalFileSpy).not.toHaveBeenCalled();
    });

    it('should store files locally when OCI is not configured', async () => {
      service = await createService({
        OCI_TENANCY_OCID: '',
        OCI_USER_OCID: '',
        OCI_FINGERPRINT: '',
        OCI_PRIVATE_KEY: '',
      });
      const storeLocalFileSpy = jest
        .spyOn(service, 'storeLocalFile')
        .mockResolvedValue('/uploads/documents/local.pdf');
      const uploadSpy = jest.spyOn(service, 'upload');

      const actualUrl = await service.storeFile({
        buffer: Buffer.from('document'),
        originalName: 'compliance.pdf',
        mimeType: 'application/pdf',
        destinationDir: 'uploads/documents',
      });

      expect(actualUrl).toBe('/uploads/documents/local.pdf');
      expect(storeLocalFileSpy).toHaveBeenCalledTimes(1);
      const [localFileParams] = storeLocalFileSpy.mock.calls[0] as [
        {
          buffer: Buffer;
          destinationDir?: string;
          originalName?: string;
          mimeType?: string;
        },
      ];
      expect(localFileParams.buffer).toBeInstanceOf(Buffer);
      expect(localFileParams.destinationDir).toBe('uploads/documents');
      expect(localFileParams.originalName).toMatch(/.+\.pdf$/);
      expect(localFileParams.mimeType).toBe('application/pdf');
      expect(uploadSpy).not.toHaveBeenCalled();
    });
  });
});
