import { useParams } from 'react-router-dom';
import ProductWizard from './ProductWizard';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  return <ProductWizard mode="edit" productId={id} />;
}
