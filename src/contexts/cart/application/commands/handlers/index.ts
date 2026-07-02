import { AddToCartHandler } from './add-to-cart.handler';
import { UpdateCartItemHandler } from './update-cart-item.handler';
import { RemoveCartItemHandler } from './remove-cart-item.handler';
import { ClearCartHandler } from './clear-cart.handler';
import { UpdateSupplierGroupHandler } from './update-supplier-group.handler';
import { UploadSupplierAttachmentHandler } from './upload-supplier-attachment.handler';
import { RemoveSupplierAttachmentHandler } from './remove-supplier-attachment.handler';
import { MergeGuestCartHandler } from './merge-guest-cart.handler';

export const CartCommandHandlers = [
  AddToCartHandler,
  UpdateCartItemHandler,
  RemoveCartItemHandler,
  ClearCartHandler,
  UpdateSupplierGroupHandler,
  UploadSupplierAttachmentHandler,
  RemoveSupplierAttachmentHandler,
  MergeGuestCartHandler,
];
