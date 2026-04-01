import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProductBySlug } from '@/config/checkoutProducts';

const CheckoutSucesso = () => {
  const [searchParams] = useSearchParams();
  const productSlug = searchParams.get('product') || '';
  const product = getProductBySlug(productSlug);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="w-20 h-20 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Pagamento confirmado!
        </h1>
        <p className="text-muted-foreground">
          {product
            ? `Seu acesso ao "${product.title}" foi liberado com sucesso.`
            : 'Seu pagamento foi processado com sucesso.'}
        </p>
        <div className="pt-4">
          <Link to="/">
            <Button variant="default" size="lg">
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSucesso;
