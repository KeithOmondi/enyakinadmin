import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { PageHeader } from '@/components/ui';
import { PurchaseForm } from '../components/PurchaseForm';

export function NewPurchasePage() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Receive stock" description="Record a delivery. Quantities are added to stock and the unit cost becomes the product's cost price." />
      <PurchaseForm
        onSaved={(summary) => {
          toast.success(summary);
          navigate('/purchases');
        }}
      />
    </>
  );
}
