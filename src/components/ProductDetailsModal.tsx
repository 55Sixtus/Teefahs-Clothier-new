import ProductModal, { ProductModalProps } from './ProductModal';

export type { ProductModalProps };
export { ProductModal };
export default function ProductDetailsModal({ product, onClose }: { product: any; onClose: () => void }) {
  return <ProductModal product={product} isOpen={!!product} onClose={onClose} />;
}
