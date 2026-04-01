import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CheckoutCancelado = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <XCircle className="w-20 h-20 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Pagamento cancelado
        </h1>
        <p className="text-muted-foreground">
          O pagamento não foi concluído. Nenhuma cobrança foi realizada.
          Você pode tentar novamente quando quiser.
        </p>
        <div className="pt-4 space-x-3">
          <Link to="/">
            <Button variant="outline" size="lg">
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCancelado;
