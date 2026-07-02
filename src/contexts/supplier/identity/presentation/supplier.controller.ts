import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AllowUnverified } from '../../../../shared/decorators/allow-unverified.decorator';
import type { FastifyRequest } from 'fastify';
import { RegisterSupplierDto } from './dto/register-supplier.dto';
import { CompleteSupplierProfileDto } from './dto/complete-supplier-profile.dto';
import { UploadSupplierDocumentDto } from './dto/upload-supplier-document.dto';
import { UpdateBusinessInfoDto } from './dto/update-business-info.dto';
import { RegisterSupplierCommand } from '../application/commands/register-supplier.command';
import { CompleteSupplierProfileCommand } from '../application/commands/complete-supplier-profile.command';
import { UploadSupplierDocumentCommand } from '../application/commands/upload-supplier-document.command';
import { UpdateBusinessInfoCommand } from '../application/commands/update-business-info.command';
import { GetSupplierQuery } from '../application/queries/get-supplier.query';
import { GetSupplierDocumentsQuery } from '../application/queries/get-supplier-documents.query';
import { GetCurrentSupplierQuery } from '../application/queries/get-current-supplier.query';
import { ListSuppliersQuery } from '../application/queries/list-suppliers.query';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { StorageService } from '../../../../shared/infrastructure/services/storage.service';
import { SessionAuthGuard } from '../../../../shared/infrastructure/guards/session-auth.guard';
import { AdminGuard } from '../../../../shared/guards/admin.guard';
import { SupplierFormatter } from './supplier.formatter';
import { ApproveOrRejectSupplierDto } from './dto/approve-or-reject-supplier.dto';
import { ApproveOrRejectSupplierCommand } from '../application/commands/approve-or-reject-supplier.command';

type MultipartFile = {
  toBuffer: () => Promise<Buffer>;
  filename: string;
  mimetype: string;
};

type SessionRequest = FastifyRequest & {
  session: {
    user: {
      id: number;
      _id: string;
      email: string;
      role: string;
      verifiedAt: Date | null;
    };
  };
};

@Controller('suppliers')
export class SupplierController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly storageService: StorageService,
  ) {}

  @Post('register')
  @UseGuards(SessionAuthGuard)
  async register(
    @Body() dto: RegisterSupplierDto,
    @Req() req: FastifyRequest,
  ): Promise<{
    supplier: Record<string, unknown>;
    documents: Record<string, unknown>[];
  }> {
    const sessionUser = (req as SessionRequest).session.user;

    const body = req.body as Record<string, unknown>;
    const filePart = body.registrationFile as MultipartFile | undefined;
    if (!filePart?.toBuffer) {
      throw new BadRequestException('registrationFile is required.');
    }

    const buffer = await filePart.toBuffer();
    const registrationFileUrl = await this.storageService.storeFile({
      buffer,
      originalName: filePart.filename,
      mimeType: filePart.mimetype,
    });

    const result = (await this.commandBus.execute(
      new RegisterSupplierCommand(sessionUser.id, {
        ...dto,
        registrationFileUrl,
      }),
    )) as unknown as { supplier: Record<string, unknown> };

    const documents = (await this.queryBus.execute(
      new GetSupplierDocumentsQuery(sessionUser.id),
    )) as unknown as Record<string, unknown>[];

    return {
      supplier: await SupplierFormatter.supplier(
        result.supplier,
        this.storageService,
      ),
      documents: await SupplierFormatter.documents(
        documents,
        this.storageService,
      ),
    };
  }

  @Patch('profile')
  @UseGuards(SessionAuthGuard)
  async completeProfile(
    @Body() dto: CompleteSupplierProfileDto,
    @Req() req: FastifyRequest,
  ): Promise<{
    supplier: Record<string, unknown>;
    documents: Record<string, unknown>[];
  }> {
    const sessionUser = (req as SessionRequest).session.user;

    let logoUrl: string | undefined;
    const galleryUrls: string[] = [];

    const body = req.body as Record<string, unknown>;
    const logoPart = body.logo as MultipartFile | undefined;
    if (logoPart?.toBuffer) {
      const buffer = await logoPart.toBuffer();
      logoUrl = await this.storageService.storeFile({
        buffer,
        originalName: logoPart.filename,
        mimeType: logoPart.mimetype,
        destinationDir: 'uploads/logos',
      });
    }
    const galleryRaw = body.gallery;
    const galleryParts: MultipartFile[] = Array.isArray(galleryRaw)
      ? (galleryRaw as MultipartFile[])
      : galleryRaw
        ? [galleryRaw as MultipartFile]
        : [];
    for (const part of galleryParts) {
      if (part?.toBuffer) {
        const buffer = await part.toBuffer();
        const url = await this.storageService.storeFile({
          buffer,
          originalName: part.filename,
          mimeType: part.mimetype,
          destinationDir: 'uploads/gallery',
        });
        galleryUrls.push(url);
      }
    }

    const supplier = (await this.commandBus.execute(
      new CompleteSupplierProfileCommand(sessionUser.id, {
        ...dto,
        ...(logoUrl ? { logoUrl } : {}),
        ...(galleryUrls.length > 0 ? { galleryUrls } : {}),
      }),
    )) as unknown as Record<string, unknown>;

    type DocumentPart = {
      file?: MultipartFile;
      documentType?: string;
      documentName?: string;
    };
    const docMap = new Map<number, DocumentPart>();
    for (const [key, value] of Object.entries(body)) {
      const match = key.match(/^documentFiles\[(\d+)\]\[(\w+)\]$/);
      if (!match) continue;
      const idx = parseInt(match[1], 10);
      const field = match[2];
      if (!docMap.has(idx)) docMap.set(idx, {});
      const entry = docMap.get(idx)!;
      if (field === 'file') entry.file = value as MultipartFile;
      else if (field === 'documentType') entry.documentType = value as string;
      else if (field === 'documentName') entry.documentName = value as string;
    }

    for (const idx of [...docMap.keys()].sort((a, b) => a - b)) {
      const { file, documentType, documentName } = docMap.get(idx)!;
      if (!file?.toBuffer) continue;
      if (!documentType) {
        throw new BadRequestException(
          `documentFiles[${idx}][documentType] is required when a file is provided.`,
        );
      }
      const buffer = await file.toBuffer();
      const fileUrl = await this.storageService.storeFile({
        buffer,
        originalName: file.filename,
        mimeType: file.mimetype,
        destinationDir: 'uploads/documents',
      });
      await this.commandBus.execute(
        new UploadSupplierDocumentCommand(
          sessionUser.id,
          documentType,
          documentName ?? file.filename,
          fileUrl,
        ),
      );
    }

    const documents = (await this.queryBus.execute(
      new GetSupplierDocumentsQuery(sessionUser.id),
    )) as unknown as Record<string, unknown>[];

    return {
      supplier: await SupplierFormatter.supplier(supplier, this.storageService),
      documents: await SupplierFormatter.documents(
        documents,
        this.storageService,
      ),
    };
  }

  @Post('documents')
  @UseGuards(SessionAuthGuard)
  async uploadDocument(
    @Body() dto: UploadSupplierDocumentDto,
    @Req() req: FastifyRequest,
  ): Promise<{ document: Record<string, unknown> }> {
    const sessionUser = (req as SessionRequest).session.user;

    const body = req.body as Record<string, unknown>;
    const filePart = body.file as MultipartFile | undefined;
    let fileUrl = '';
    if (filePart?.toBuffer) {
      const buffer = await filePart.toBuffer();
      fileUrl = await this.storageService.storeFile({
        buffer,
        originalName: filePart.filename,
        mimeType: filePart.mimetype,
        destinationDir: 'uploads/documents',
      });
    }

    if (!fileUrl) throw new BadRequestException('File is required.');

    const document = (await this.commandBus.execute(
      new UploadSupplierDocumentCommand(
        sessionUser.id,
        dto.documentType,
        dto.documentName,
        fileUrl,
      ),
    )) as unknown as Record<string, unknown>;

    return {
      document: await SupplierFormatter.document(document, this.storageService),
    };
  }

  @Get('documents')
  @UseGuards(SessionAuthGuard)
  async listDocuments(
    @Req() req: FastifyRequest,
  ): Promise<{ documents: Record<string, unknown>[] }> {
    const sessionUser = (req as SessionRequest).session.user;

    const documents = (await this.queryBus.execute(
      new GetSupplierDocumentsQuery(sessionUser.id),
    )) as unknown as Record<string, unknown>[];

    return {
      documents: await SupplierFormatter.documents(
        documents,
        this.storageService,
      ),
    };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async getMe(@Req() req: FastifyRequest): Promise<{
    supplier: Record<string, unknown>;
  }> {
    const sessionUser = (req as SessionRequest).session.user;
    const supplier = (await this.queryBus.execute(
      new GetCurrentSupplierQuery(sessionUser.id),
    )) as unknown as Record<string, unknown>;
    return {
      supplier: await SupplierFormatter.supplier(supplier, this.storageService),
    };
  }

  @Patch('business-info')
  @UseGuards(SessionAuthGuard)
  async updateBusinessInfo(
    @Body() dto: UpdateBusinessInfoDto,
    @Req() req: FastifyRequest,
  ): Promise<{ supplier: Record<string, unknown> }> {
    const sessionUser = (req as SessionRequest).session.user;

    let logoUrl: string | undefined;
    const logoPart = dto.logo as MultipartFile | undefined;
    if (logoPart?.toBuffer) {
      const buffer = await logoPart.toBuffer();
      logoUrl = await this.storageService.storeFile({
        buffer,
        originalName: logoPart.filename,
        mimeType: logoPart.mimetype,
        destinationDir: 'uploads/logos',
      });
    }

    const removeLogo = dto.removeLogo === true;

    const supplier = (await this.commandBus.execute(
      new UpdateBusinessInfoCommand(sessionUser.id, {
        ...dto,
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        removeLogo,
      }),
    )) as unknown as Record<string, unknown>;

    return {
      supplier: await SupplierFormatter.supplier(supplier, this.storageService),
    };
  }

  @AllowUnverified()
  @Get()
  async list(@Query() dto: ListSuppliersQueryDto): Promise<{
    items: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const result = (await this.queryBus.execute(
      new ListSuppliersQuery({
        search: dto.search,
        supplierTypes: dto.supplierTypes,
        countries: dto.countries,
        region: dto.region,
        verifiedOnly: dto.verifiedOnly,
        page: dto.page,
        limit: dto.limit,
        sort: dto.sort,
      }),
    )) as unknown as {
      items: Record<string, unknown>[];
      total: number;
      page: number;
      limit: number;
    };

    const items = await SupplierFormatter.listItems(
      result.items,
      this.storageService,
    );

    return {
      items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @AllowUnverified()
  @Get(':supplierId')
  async getOne(@Param('supplierId') supplierId: string): Promise<{
    supplier: Record<string, unknown>;
    documents: Record<string, unknown>[];
  }> {
    const result = (await this.queryBus.execute(
      new GetSupplierQuery(supplierId),
    )) as unknown as {
      supplier: Record<string, unknown>;
      documents: Record<string, unknown>[];
    };

    return {
      supplier: await SupplierFormatter.supplier(
        result.supplier,
        this.storageService,
      ),
      documents: await SupplierFormatter.documents(
        result.documents,
        this.storageService,
      ),
    };
  }

  @Patch(':supplierId/approval')
  @UseGuards(SessionAuthGuard, AdminGuard)
  async approveOrReject(
    @Param('supplierId') supplierId: string,
    @Body() dto: ApproveOrRejectSupplierDto,
    @Req() req: FastifyRequest,
  ): Promise<Record<string, unknown>> {
    const actor = (req as SessionRequest).session.user;
    const supplier = await this.commandBus.execute(
      new ApproveOrRejectSupplierCommand(
        supplierId,
        dto.decision,
        dto.reason,
        actor.id,
        actor.role,
      ),
    );
    return SupplierFormatter.supplier(supplier, this.storageService);
  }
}
