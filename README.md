# SmartDash - Prototipo 2

Nuevo prototipo que combina el diseño actual de Next.js con TypeScript y el diseño HTML del archivo prototipo2.txt.

## Características principales

### Diseño combinado
- **Estructura moderna**: Basada en Next.js 14 con TypeScript y Tailwind CSS
- **Componentes reutilizables**: Sistema de componentes UI con shadcn/ui
- **Diseño responsive**: Funciona perfectamente en móvil y desktop
- **Transiciones suaves**: Animaciones y efectos visuales mejorados

### Funcionalidades implementadas

#### 1. Pantalla de Onboarding
- Área de drag & drop para archivos CSV/Excel
- Validación de archivos (tipo y tamaño)
- Progreso de carga y procesamiento
- Vista previa de datos
- Diseño similar al archivo HTML pero con componentes React

#### 2. Dashboard Principal
- Sidebar colapsible con navegación
- Métricas principales con indicadores de cambio
- Gráficos interactivos (Chart.js + react-chartjs-2):
  - Gráfico de barras para ventas mensuales
  - Gráfico de dona para categorías
  - Gráfico de líneas para crecimiento
- Header con controles de navegación
- Diseño adaptativo para móvil

#### 3. Chat IA Integrado
- Panel deslizable desde la derecha
- Interfaz de chat con mensajes
- Gráficos integrados en respuestas del bot
- Input con envío por Enter o botón

## Mejoras respecto al diseño original

### Técnicas
- **TypeScript**: Tipado estático para mejor desarrollo
- **Componentes modulares**: Fácil mantenimiento y reutilización
- **Estado reactivo**: Gestión eficiente del estado con React hooks
- **Performance**: Optimizado para carga rápida

### UX/UI
- **Consistencia**: Sistema de design tokens con Tailwind CSS
- **Accesibilidad**: Componentes accesibles por defecto
- **Responsive mejorado**: Mejor experiencia en todos los dispositivos
- **Feedback visual**: Estados de carga, errores y éxito claramente indicados

## Estructura del proyecto

```
Prototipo2/
├── app/
│   ├── globals.css          # Estilos globales y variables CSS
│   ├── layout.tsx           # Layout principal de la aplicación
│   └── page.tsx            # Página principal que maneja el estado
├── components/
│   ├── ui/                 # Componentes base (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── progress.tsx
│   ├── chart-component.tsx  # Wrapper para Chart.js
│   ├── dashboard-page.tsx   # Página principal del dashboard
│   └── onboarding-page.tsx  # Página de carga de archivos
├── lib/
│   └── utils.ts            # Utilidades (cn function)
└── ...configs              # Configuraciones de Next.js, TypeScript, etc.
```

## Próximos pasos para producción

### Backend necesario
1. **API de subida de archivos**: Endpoint para procesar CSV/Excel
2. **Base de datos**: Almacenamiento de datos y configuraciones
3. **Procesamiento de datos**: Análisis automático y generación de insights
4. **IA/ML**: Sistema de chat inteligente y recomendaciones
5. **Autenticación**: Sistema de usuarios y permisos

### Funcionalidades adicionales
1. **Múltiples dashboards**: Diferentes vistas según tipo de datos
2. **Exportación**: PDF, Excel, imágenes de reportes
3. **Configuración avanzada**: Personalización de métricas y gráficos
4. **Colaboración**: Compartir dashboards y comentarios
5. **Alertas**: Notificaciones automáticas por cambios en datos

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
```

La aplicación estará disponible en `http://localhost:3000`