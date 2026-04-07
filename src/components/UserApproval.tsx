import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, XCircle, User, Users, Shield, Store, Search, AlertCircle, Settings } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPermissionsEditor } from '@/components/UserPermissionsEditor';

interface PendingUser {
  id: string;
  full_name: string;
  store: string | null;
  email: string;
  created_at: string;
}

interface ActiveUser {
  id: string;
  full_name: string;
  store: string | null;
  email: string;
  role: 'admin' | 'manager' | 'salesperson';
  created_at: string;
  stores_count?: number;
  modules_count?: number;
  permissions_count?: number;
}

const UserApproval = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [userToDelete, setUserToDelete] = useState<ActiveUser | null>(null);
  const [editingUser, setEditingUser] = useState<ActiveUser | null>(null);
  const { toast } = useToast();

  const fetchPendingUsers = async () => {
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, store, created_at');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    const { data: usersWithRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return [];
    }

    const userIdsWithRoles = new Set(usersWithRoles?.map(r => r.user_id) || []);
    const pending = allProfiles?.filter(p => !userIdsWithRoles.has(p.id)) || [];

    return pending.map(p => ({
      ...p,
      email: 'Usuário pendente',
      created_at: p.created_at || new Date().toISOString(),
    }));
  };

  const fetchActiveUsers = async () => {
    const { data: userRoles, error: rolesError} = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return [];
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, store, created_at');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    // Buscar contadores de permissões
    const { data: stores } = await supabase.from('user_stores').select('user_id, store');
    const { data: modules } = await supabase.from('user_modules').select('user_id, module');
    const { data: perms } = await supabase.from('user_permissions').select('user_id, can_export, can_view_seller_details, can_view_vehicle_details, can_view_full_tables');

    const storesCounts = stores?.reduce((acc, s) => {
      acc[s.user_id] = (acc[s.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const modulesCounts = modules?.reduce((acc, m) => {
      acc[m.user_id] = (acc[m.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const permsCounts = perms?.reduce((acc, p) => {
      const count = [p.can_export, p.can_view_seller_details, p.can_view_vehicle_details, p.can_view_full_tables].filter(Boolean).length;
      acc[p.user_id] = count;
      return acc;
    }, {} as Record<string, number>) || {};

    const usersWithRoles = profiles
      ?.map(profile => {
        const userRole = userRoles?.find(r => r.user_id === profile.id);
        if (!userRole) return null;
        
        return {
          ...profile,
          role: userRole.role as 'admin' | 'manager' | 'salesperson',
          email: `${profile.full_name.toLowerCase().replace(/\s+/g, '.')}@empresa.com`,
          stores_count: storesCounts[profile.id] || 0,
          modules_count: modulesCounts[profile.id] || 0,
          permissions_count: permsCounts[profile.id] || 0,
        };
      })
      .filter(Boolean) as ActiveUser[];

    return usersWithRoles || [];
  };

  const fetchAllData = async () => {
    setLoading(true);
    const [pending, active] = await Promise.all([
      fetchPendingUsers(),
      fetchActiveUsers(),
    ]);
    setPendingUsers(pending);
    setActiveUsers(active);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const approveUser = async (userId: string, role: 'admin' | 'manager' | 'salesperson') => {
    setProcessingId(userId);

    const { error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role: role as any }]);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao aprovar usuário',
        description: error.message,
      });
    } else {
      toast({
        title: 'Usuário aprovado!',
        description: 'O usuário agora pode acessar o sistema.',
      });
      fetchAllData();
    }

    setProcessingId(null);
  };

  const rejectUser = async (userId: string) => {
    setProcessingId(userId);

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      toast({
        variant: 'destructive',
        title: 'Erro ao rejeitar usuário',
        description: profileError.message,
      });
      setProcessingId(null);
      return;
    }

    toast({
      title: 'Usuário rejeitado',
      description: 'A conta foi removida do sistema.',
    });

    fetchAllData();
    setProcessingId(null);
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'manager' | 'salesperson') => {
    setProcessingId(userId);

    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as any })
      .eq('user_id', userId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar role',
        description: error.message,
      });
    } else {
      toast({
        title: 'Role atualizada!',
        description: 'As permissões do usuário foram alteradas.',
      });
      fetchAllData();
    }

    setProcessingId(null);
  };

  const deleteUser = async () => {
    if (!userToDelete) return;

    setProcessingId(userToDelete.id);

    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userToDelete.id);

    if (roleError) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover usuário',
        description: roleError.message,
      });
      setProcessingId(null);
      setUserToDelete(null);
      return;
    }

    toast({
      title: 'Acesso removido',
      description: 'O usuário não pode mais acessar o sistema.',
    });

    fetchAllData();
    setProcessingId(null);
    setUserToDelete(null);
  };

  const filteredUsers = activeUsers.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStore = storeFilter === 'all' || user.store === storeFilter;
    
    return matchesSearch && matchesRole && matchesStore;
  });

  const uniqueStores = Array.from(new Set(activeUsers.map(u => u.store).filter(Boolean)));

  const stats = {
    total: activeUsers.length,
    admins: activeUsers.filter(u => u.role === 'admin').length,
    managers: activeUsers.filter(u => u.role === 'manager').length,
    salespeople: activeUsers.filter(u => u.role === 'salesperson').length,
    pending: pendingUsers.length,
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'destructive',
      manager: 'default',
      salesperson: 'secondary',
    } as const;

    const labels = {
      admin: 'Admin',
      manager: 'Gerente',
      salesperson: 'Vendedor',
    } as const;

    return (
      <Badge variant={variants[role as keyof typeof variants]}>
        {labels[role as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerentes</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.managers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.salespeople}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pendentes ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Ativos ({activeUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Users Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Aguardando Aprovação</CardTitle>
              <CardDescription>
                Aprove ou rejeite novos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum usuário pendente
                </p>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        {user.store && (
                          <p className="text-sm text-muted-foreground">
                            Loja sugerida: {user.store}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(role) => approveUser(user.id, role as any)}
                          disabled={processingId === user.id}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Aprovar como..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Gerente</SelectItem>
                            <SelectItem value="salesperson">Vendedor</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => rejectUser(user.id)}
                          disabled={processingId === user.id}
                        >
                          {processingId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Users Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Ativos</CardTitle>
              <CardDescription>
                Gerencie roles e permissões dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="salesperson">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por loja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as lojas</SelectItem>
                    {uniqueStores.map((store) => (
                      <SelectItem key={store} value={store!}>
                        {store}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Loja Mãe</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Lojas</TableHead>
                      <TableHead>Módulos</TableHead>
                      <TableHead>Controles</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>
                            {user.store ? (
                              <Badge variant="outline">{user.store}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {user.stores_count === 0 ? 'Todas' : user.stores_count}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {user.modules_count === 0 ? 'Todos' : user.modules_count}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{user.permissions_count || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Select
                                value={user.role}
                                onValueChange={(role) => updateUserRole(user.id, role as any)}
                                disabled={processingId === user.id}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="manager">Gerente</SelectItem>
                                  <SelectItem value="salesperson">Vendedor</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setEditingUser(user)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => setUserToDelete(user)}
                                disabled={processingId === user.id}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o acesso de{' '}
              <span className="font-semibold">{userToDelete?.full_name}</span>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Editor Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Permissões</DialogTitle>
            <DialogDescription>
              {editingUser?.full_name} - {getRoleBadge(editingUser?.role || 'salesperson')}
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <UserPermissionsEditor
              userId={editingUser.id}
              userRole={editingUser.role}
              onSave={() => {
                setEditingUser(null);
                fetchAllData();
              }}
              onCancel={() => setEditingUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserApproval;
