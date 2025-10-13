# 🔐 Guía de Implementación de Autenticación con auth.kailasa.ai

## ✅ Implementación Completada

### Archivos Creados

#### 1. **Utilidades de Auth** (`src/utils/auth-service.ts`)
- Funciones de integración con `auth.kailasa.ai`
- Tipos TypeScript para sesiones y usuarios
- Helpers para intercambio de tokens
- Utilidades para manejo de cookies y expiración

#### 2. **Rutas de Autenticación**

**Login Routes:**
- `src/routes/auth/login/index.ts` - Redirige a auth service (email/password)
- `src/routes/auth/login/google/index.ts` - Redirige a Google OAuth

**Callback & Management:**
- `src/routes/auth/return/index.ts` - Maneja retorno exitoso, intercambia tokens
- `src/routes/auth/logout/index.ts` - Cierra sesión y limpia cookies
- `src/routes/auth/error/index.tsx` - Página de errores de autenticación

#### 3. **API Routes**
- `src/routes/api/me/index.ts` - Obtiene datos del usuario actual
- `src/routes/api/health/index.ts` - Verifica estado del auth service

#### 4. **Plugin Global** (`src/routes/plugin@auth.ts`)
- `useUserContext` - routeLoader$ global
- Proporciona contexto de auth a todos los componentes
- Maneja validación de sesión automáticamente

#### 5. **UI Updates**
- `src/routes/layout.tsx` - Integrado con contexto de auth
  - Muestra perfil de usuario si está autenticado
  - Botón "Sign In" si no está autenticado
  - Botón "Sign Out" para usuarios autenticados
- `src/routes/dashboard/index.tsx` - Página de ejemplo protegida

---

## 🚀 Configuración Inicial

### 1. Variables de Entorno

Edita `.env.local` y reemplaza los valores de ejemplo:

```bash
# Obtén estos valores del panel de admin de auth.kailasa.ai
AUTH_CLIENT_ID=tu-client-id-real
AUTH_CLIENT_SECRET=tu-client-secret-real

# Para desarrollo local
AUTH_REDIRECT_URI=http://localhost:5173/auth/return
AUTH_ERROR_URL=http://localhost:5173/auth/error

# Para producción
# AUTH_REDIRECT_URI=https://tu-dominio.com/auth/return
# AUTH_ERROR_URL=https://tu-dominio.com/auth/error
```

### 2. Registrar URLs de Redirect

En el panel de admin de `auth.kailasa.ai`:
1. Registra tu `client_id`
2. Añade las URLs de redirect:
   - **Development:** `http://localhost:5173/auth/return`
   - **Production:** `https://tu-dominio.com/auth/return`

---

## 📖 Cómo Usar

### En tus Componentes

```tsx
import { component$ } from '@builder.io/qwik';
import { useUserContext } from '~/routes/plugin@auth';

export default component$(() => {
  const userContext = useUserContext();

  if (userContext.value.isAuthenticated) {
    const user = userContext.value.user;
    return (
      <div>
        <h1>Welcome, {user?.first_name}!</h1>
        <p>Email: {user?.email}</p>
      </div>
    );
  }

  return (
    <div>
      <a href="/auth/login">Sign In</a>
    </div>
  );
});
```

### Rutas Protegidas

Ver ejemplo completo en `src/routes/dashboard/index.tsx`:
- Verifica autenticación
- Redirige a login si no está autenticado
- Muestra datos del usuario

### Desde el Cliente (JavaScript)

```tsx
import { component$, useSignal, useTask$ } from '@builder.io/qwik';

export default component$(() => {
  const user = useSignal(null);

  useTask$(async () => {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        user.value = await response.json();
      }
    } catch (err) {
      console.error('Not authenticated');
    }
  });

  return <div>{user.value ? `Hello ${user.value.user.first_name}` : 'Not logged in'}</div>;
});
```

---

## 🔄 Flujo de Autenticación

### 1. **Inicio de Sesión (Email/Password)**
```
Usuario visita: /auth/login
  ↓
Redirige a: https://auth.kailasa.ai/auth/sign-in?client_id=...&redirect_uri=...
  ↓
Usuario ingresa credenciales
  ↓
Auth service valida y redirige a: /auth/return?auth_code=...&session_token=...
  ↓
Tu app intercambia auth_code por session_token (server-side)
  ↓
Guarda session_token en cookie HttpOnly
  ↓
Redirige a: /playlists (o dashboard)
```

### 2. **Inicio de Sesión (Google OAuth)**
```
Usuario visita: /auth/login/google
  ↓
Redirige a: https://auth.kailasa.ai/auth/sign-in/google?client_id=...
  ↓
Google OAuth flow
  ↓
Auth service procesa y redirige a: /auth/return?auth_code=...
  ↓
[mismo flujo que email/password]
```

### 3. **Verificación de Sesión**
```
En cada request:
  ↓
plugin@auth.ts ejecuta useUserContext
  ↓
Lee cookie app_session_token
  ↓
Si existe y no expiró:
  - Llama a auth.kailasa.ai/auth/get-session
  - Retorna { isAuthenticated: true, user: {...} }
Si no existe o expiró:
  - Limpia cookies
  - Retorna { isAuthenticated: false, user: null }
```

---

## 🛡️ Seguridad

### ✅ Implementado

- ✅ **HttpOnly Cookies**: `app_session_token` no accesible desde JavaScript
- ✅ **Secure Cookies**: Solo HTTPS en producción
- ✅ **SameSite=Lax**: Protección contra CSRF
- ✅ **Server-Side Token Exchange**: `client_secret` nunca expuesto al cliente
- ✅ **Session Expiration**: Validación automática de expiración
- ✅ **Cookie Cleanup**: Limpieza automática de cookies inválidas

### 🔒 Mejores Prácticas

1. **NUNCA** expongas `client_secret` al frontend
2. **NUNCA** guardes `session_token` en localStorage
3. **SIEMPRE** usa HTTPS en producción
4. **SIEMPRE** valida sesión en server-side para rutas protegidas

---

## 🧪 Testing

### Verificar Health Check
```bash
curl http://localhost:5173/api/health
```

### Verificar Sesión (con cookie)
```bash
curl http://localhost:5173/api/me \
  -H "Cookie: app_session_token=YOUR_TOKEN"
```

### Test Login Flow (manual)
1. Visita: `http://localhost:5173/auth/login`
2. Deberías ser redirigido a `auth.kailasa.ai`
3. Ingresa credenciales
4. Deberías regresar a tu app autenticado
5. Visita: `http://localhost:5173/dashboard`

---

## 🚀 Deployment

### Variables de Entorno en Producción

Asegúrate de configurar en tu plataforma de deployment:

```bash
AUTH_BASE=https://auth.kailasa.ai
AUTH_CLIENT_ID=<tu-client-id>
AUTH_CLIENT_SECRET=<tu-client-secret>
AUTH_REDIRECT_URI=https://tu-dominio.com/auth/return
AUTH_ERROR_URL=https://tu-dominio.com/auth/error
```

### Cloudflare Pages
```bash
wrangler pages secret put AUTH_CLIENT_ID
wrangler pages secret put AUTH_CLIENT_SECRET
```

### Vercel
```bash
vercel env add AUTH_CLIENT_ID
vercel env add AUTH_CLIENT_SECRET
```

---

## 📚 API Reference

### Endpoints Disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/auth/login` | Inicia login con email/password |
| GET | `/auth/login/google` | Inicia login con Google OAuth |
| GET | `/auth/return` | Callback después de autenticación exitosa |
| GET | `/auth/logout` | Cierra sesión |
| GET | `/auth/error` | Página de errores de autenticación |
| GET | `/api/me` | Obtiene usuario actual (requiere auth) |
| GET | `/api/health` | Verifica estado del auth service |

### Types

```typescript
interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender?: string;
  created_at?: string;
}

interface UserContext {
  isAuthenticated: boolean;
  user: AuthUser | null;
}
```

---

## 🐛 Troubleshooting

### Error: "Auth configuration missing"
- Verifica que `.env.local` tiene todos los valores
- Reinicia el servidor de desarrollo

### Error: "Session expired"
- La sesión tiene una duración limitada
- Usuario debe volver a hacer login

### No redirige después del login
- Verifica que `AUTH_REDIRECT_URI` está registrada en auth.kailasa.ai
- Revisa que la URL coincide exactamente (incluyendo http/https)

### Cookie no se guarda
- En desarrollo local, asegúrate de usar `http://localhost:5173`
- En producción, asegúrate de usar HTTPS

---

## 🎯 Próximos Pasos

- [ ] Obtener credenciales reales de auth.kailasa.ai
- [ ] Actualizar `.env.local` con valores reales
- [ ] Registrar URLs de redirect
- [ ] Probar flujo completo de autenticación
- [ ] Implementar rutas protegidas adicionales
- [ ] Personalizar página de dashboard
- [ ] Añadir gestión de perfil de usuario

---

## 📞 Soporte

Si necesitas ayuda con la integración, contacta al equipo de auth.kailasa.ai o revisa la documentación completa en su sitio oficial.

---

**¡Implementación completada! 🎉**
