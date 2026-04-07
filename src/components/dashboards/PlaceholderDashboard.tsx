import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderDashboardProps {
  title: string;
  description?: string;
}

export const PlaceholderDashboard = ({ title, description }: PlaceholderDashboardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Construction className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">
          Este quadro está em desenvolvimento
        </p>
      </CardContent>
    </Card>
  );
};
