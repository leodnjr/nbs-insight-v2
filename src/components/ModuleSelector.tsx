import { Building2, Users, Wrench } from 'lucide-react';
import { MODULES, type ModuleType } from '@/types/modules';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MODULE_ICONS: Record<ModuleType, React.ComponentType<{ className?: string }>> = {
  diretoria: Building2,
  gerencia: Users,
  'pos-venda': Wrench,
};

interface ModuleSelectorProps {
  currentModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
}

export const ModuleSelector = ({ currentModule, onModuleChange }: ModuleSelectorProps) => {
  const handleChange = (value: string) => {
    if (value !== currentModule) {
      onModuleChange(value as ModuleType);
      // Recarregar a página para resetar estado
      window.location.reload();
    }
  };

  const currentModuleData = MODULES[currentModule];
  const Icon = MODULE_ICONS[currentModule];

  return (
    <Select value={currentModule} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span>{currentModuleData.name}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.values(MODULES).map((module) => {
          const Icon = MODULE_ICONS[module.id];
          return (
            <SelectItem key={module.id} value={module.id}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <div>
                  <div className="font-medium">{module.name}</div>
                  <div className="text-xs text-muted-foreground">{module.description}</div>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
