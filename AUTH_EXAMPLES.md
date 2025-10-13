# 🎯 Ejemplos de Uso del Sistema de Autenticación

## 1. Proteger una Ruta Completa

```tsx
// src/routes/admin/index.tsx
import { component$ } from '@builder.io/qwik';
import { useUserContext } from '~/routes/plugin@auth';

export default component$(() => {
  const userContext = useUserContext();

  // Redirigir si no está autenticado
  if (!userContext.value.isAuthenticated) {
    return (
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <h1>Acceso Denegado</h1>
          <p>Necesitas iniciar sesión para ver esta página</p>
          <a href="/auth/login">Iniciar Sesión</a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Panel de Administración</h1>
      <p>Bienvenido, {userContext.value.user?.first_name}!</p>
    </div>
  );
});
```

## 2. Mostrar Contenido Diferente Según Autenticación

```tsx
// src/components/Header.tsx
import { component$ } from '@builder.io/qwik';
import { useUserContext } from '~/routes/plugin@auth';

export default component$(() => {
  const userContext = useUserContext();

  return (
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/playlists">Playlists</a>
        
        {userContext.value.isAuthenticated ? (
          <>
            <a href="/dashboard">Dashboard</a>
            <span>Hola, {userContext.value.user?.first_name}!</span>
            <a href="/auth/logout">Cerrar Sesión</a>
          </>
        ) : (
          <>
            <a href="/auth/login">Iniciar Sesión</a>
            <a href="/auth/login/google">Iniciar con Google</a>
          </>
        )}
      </nav>
    </header>
  );
});
```

## 3. Obtener Datos del Usuario con API

```tsx
// src/components/UserProfile.tsx
import { component$, useSignal, useTask$ } from '@builder.io/qwik';

export default component$(() => {
  const user = useSignal<any>(null);
  const loading = useSignal(true);
  const error = useSignal('');

  useTask$(async () => {
    try {
      const response = await fetch('/api/me');
      
      if (response.ok) {
        const data = await response.json();
        user.value = data.user;
      } else if (response.status === 401) {
        error.value = 'No autenticado';
      } else {
        error.value = 'Error al cargar perfil';
      }
    } catch (err) {
      error.value = 'Error de conexión';
    } finally {
      loading.value = false;
    }
  });

  if (loading.value) {
    return <div>Cargando perfil...</div>;
  }

  if (error.value) {
    return (
      <div>
        <p>{error.value}</p>
        <a href="/auth/login">Iniciar Sesión</a>
      </div>
    );
  }

  return (
    <div>
      <h2>{user.value?.first_name} {user.value?.last_name}</h2>
      <p>Email: {user.value?.email}</p>
      <p>ID: {user.value?.id}</p>
    </div>
  );
});
```

## 4. Componente con Carga Condicional

```tsx
// src/components/ProtectedContent.tsx
import { component$, Slot } from '@builder.io/qwik';
import { useUserContext } from '~/routes/plugin@auth';

export default component$(() => {
  const userContext = useUserContext();

  if (!userContext.value.isAuthenticated) {
    return (
      <div class="p-6 bg-orange-50 border border-orange-200 rounded-xl">
        <h3 class="font-bold mb-2">Contenido Premium</h3>
        <p class="mb-4">Inicia sesión para acceder a este contenido exclusivo.</p>
        <a 
          href="/auth/login"
          class="px-4 py-2 bg-orange-600 text-white rounded-lg"
        >
          Iniciar Sesión
        </a>
      </div>
    );
  }

  return <Slot />;
});
```

**Uso:**
```tsx
<ProtectedContent>
  <div>
    <h2>Contenido Exclusivo</h2>
    <p>Solo usuarios autenticados pueden ver esto.</p>
  </div>
</ProtectedContent>
```

## 5. Hook Personalizado para Fetch Autenticado

```tsx
// src/hooks/useFetch.ts
import { useSignal, useTask$, type Signal } from '@builder.io/qwik';

export interface UseFetchResult<T> {
  data: Signal<T | null>;
  loading: Signal<boolean>;
  error: Signal<string>;
  refetch: () => Promise<void>;
}

export function useFetch<T>(url: string): UseFetchResult<T> {
  const data = useSignal<T | null>(null);
  const loading = useSignal(true);
  const error = useSignal('');

  const fetchData = async () => {
    loading.value = true;
    error.value = '';
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      data.value = await response.json();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error desconocido';
    } finally {
      loading.value = false;
    }
  };

  useTask$(async () => {
    await fetchData();
  });

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
```

**Uso:**
```tsx
export default component$(() => {
  const { data, loading, error, refetch } = useFetch('/api/me');

  if (loading.value) return <div>Cargando...</div>;
  if (error.value) return <div>Error: {error.value}</div>;
  if (!data.value) return <div>No hay datos</div>;

  return (
    <div>
      <h1>Usuario: {data.value.user.first_name}</h1>
      <button onClick$={() => refetch()}>Recargar</button>
    </div>
  );
});
```

## 6. Middleware Personalizado (Ejemplo Avanzado)

```tsx
// src/routes/plugin@requireAuth.ts
import type { RequestHandler } from '@builder.io/qwik-city';

export const onRequest: RequestHandler = async ({ cookie, redirect, url }) => {
  // Lista de rutas que requieren autenticación
  const protectedRoutes = ['/dashboard', '/admin', '/profile'];
  
  // Verificar si la ruta actual está protegida
  const requiresAuth = protectedRoutes.some(route => 
    url.pathname.startsWith(route)
  );
  
  if (requiresAuth) {
    const sessionToken = cookie.get('app_session_token')?.value;
    
    if (!sessionToken) {
      // No hay sesión, redirigir a login
      throw redirect(302, `/auth/login?redirect=${encodeURIComponent(url.pathname)}`);
    }
  }
};
```

## 7. Mostrar Información de Sesión

```tsx
// src/components/SessionInfo.tsx
import { component$ } from '@builder.io/qwik';
import { useUserContext } from '~/routes/plugin@auth';

export default component$(() => {
  const userContext = useUserContext();

  if (!userContext.value.isAuthenticated) {
    return <div>No hay sesión activa</div>;
  }

  const user = userContext.value.user!;

  return (
    <div class="bg-white p-6 rounded-xl shadow-lg">
      <h3 class="text-lg font-bold mb-4">Información de Sesión</h3>
      
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600">Usuario:</span>
          <span class="font-medium">{user.first_name} {user.last_name}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-gray-600">Email:</span>
          <span class="font-medium">{user.email}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-gray-600">ID:</span>
          <span class="font-mono text-xs">{user.id}</span>
        </div>
        
        {user.created_at && (
          <div class="flex justify-between">
            <span class="text-gray-600">Miembro desde:</span>
            <span class="font-medium">
              {new Date(user.created_at).toLocaleDateString('es-ES')}
            </span>
          </div>
        )}
      </div>

      <div class="mt-4 pt-4 border-t">
        <a 
          href="/auth/logout"
          class="block text-center py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          Cerrar Sesión
        </a>
      </div>
    </div>
  );
});
```

## 8. Formulario de Login Personalizado (Opcional)

Si quieres crear tu propio formulario en lugar de redirigir:

```tsx
// src/routes/login/index.tsx
import { component$ } from '@builder.io/qwik';
import { Form, routeAction$ } from '@builder.io/qwik-city';

export const useLoginAction = routeAction$(async (formData, { env, redirect }) => {
  const email = formData.email as string;
  const password = formData.password as string;

  // Hacer POST a auth.kailasa.ai
  const response = await fetch(`${env.get('AUTH_BASE')}/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    return { success: false, error: 'Credenciales inválidas' };
  }

  // Aquí deberías manejar el flujo de tokens...
  // Esto es más complejo y el flujo de redirect es más simple
  
  throw redirect(302, '/dashboard');
});

export default component$(() => {
  const action = useLoginAction();

  return (
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
      <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 class="text-2xl font-bold mb-6">Iniciar Sesión</h1>
        
        <Form action={action}>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              name="email"
              required
              class="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              name="password"
              required
              class="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          {action.value?.error && (
            <div class="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {action.value.error}
            </div>
          )}
          
          <button
            type="submit"
            class="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Iniciar Sesión
          </button>
        </Form>

        <div class="mt-4 text-center">
          <a href="/auth/login/google" class="text-blue-600 hover:underline">
            O iniciar con Google
          </a>
        </div>
      </div>
    </div>
  );
});
```

## 9. Guard de Ruta en routeLoader$

```tsx
// src/routes/profile/index.tsx
import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getSessionFromAuthService } from '~/utils/auth-service';

export const useProfileData = routeLoader$(async ({ cookie, redirect, env }) => {
  const sessionToken = cookie.get('app_session_token')?.value;
  
  if (!sessionToken) {
    throw redirect(302, '/auth/login?redirect=/profile');
  }

  try {
    const authBase = env.get('AUTH_BASE')!;
    const clientId = env.get('AUTH_CLIENT_ID')!;
    
    const { user } = await getSessionFromAuthService(sessionToken, clientId, authBase);
    
    // Aquí podrías cargar datos adicionales del usuario desde tu DB
    // const additionalData = await db.query('SELECT * FROM users WHERE email = ?', [user.email]);
    
    return {
      user,
      // additionalData,
    };
  } catch (err) {
    cookie.delete('app_session_token', { path: '/' });
    throw redirect(302, '/auth/login');
  }
});

export default component$(() => {
  const profileData = useProfileData();
  
  return (
    <div>
      <h1>Perfil de {profileData.value.user.first_name}</h1>
      <p>Email: {profileData.value.user.email}</p>
    </div>
  );
});
```

## 10. Verificar Permisos/Roles (Ejemplo)

```tsx
// src/utils/permissions.ts
import type { AuthUser } from './auth-service';

export function hasPermission(user: AuthUser, permission: string): boolean {
  // Aquí implementarías tu lógica de permisos
  // Por ejemplo, podrías tener roles en tu base de datos
  return true; // Placeholder
}

export function requirePermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  return hasPermission(user, permission);
}
```

**Uso en componente:**
```tsx
import { component$ } from '@builder.io/qwik';
import { useUserContext } from '~/routes/plugin@auth';
import { requirePermission } from '~/utils/permissions';

export default component$(() => {
  const userContext = useUserContext();
  
  const canEdit = requirePermission(userContext.value.user, 'edit_content');
  
  return (
    <div>
      <h1>Contenido</h1>
      {canEdit && (
        <button>Editar</button>
      )}
    </div>
  );
});
```

---

## 🎯 Próximos Pasos

1. Adapta estos ejemplos a tus necesidades específicas
2. Implementa rutas protegidas según tu aplicación
3. Añade gestión de permisos si es necesario
4. Personaliza la UI de autenticación
5. Implementa refresh de tokens si lo requieres

¿Necesitas más ejemplos? Revisa `AUTH_IMPLEMENTATION.md` para documentación técnica completa.
