import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  motivo?: 'modulo' | 'loja' | 'permissao';
  textoAdicional?: string;
}

export const AccessDenied = ({ motivo = 'modulo', textoAdicional }: AccessDeniedProps) => {
  const navigate = useNavigate();

  const mensagens = {
    modulo: 'Você não tem permissão para acessar este módulo',
    loja: 'Você não tem acesso a esta loja',
    permissao: 'Você não tem permissão para esta ação',
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
          <CardDescription className="text-base">
            {mensagens[motivo]}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {textoAdicional && (
            <p className="text-sm text-muted-foreground text-center">
              {textoAdicional}
            </p>
          )}
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full"
            variant="default"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
