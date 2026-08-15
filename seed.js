const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://libcjbesfttwgmigpkot.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYmNqYmVzZnR0d2dtaWdwa290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NjMyMTIsImV4cCI6MjEwMjIzOTIxMn0.N5TqcT78mmyi28BslDYy_0lePA33-0TQ-bCYc8bJNZ0';

const supabase = createClient(supabaseUrl, supabaseKey);

const items = [
  { codigo_sku: 'LIB-MAT-01', nombre: 'Matemáticas 1er Grado', descripcion: 'Texto escolar oficial de educación primaria', precio_usd: 12.50, stock_minimo: 5, stock_inicial: 50 },
  { codigo_sku: 'LIB-LEN-02', nombre: 'Lengua y Literatura 2do Grado', descripcion: 'Texto oficial ilustrado', precio_usd: 14.00, stock_minimo: 5, stock_inicial: 45 },
  { codigo_sku: 'LIB-HIS-03', nombre: 'Historia de Venezuela 3er Grado', descripcion: 'Historia patria para primaria', precio_usd: 11.00, stock_minimo: 5, stock_inicial: 30 },
  { codigo_sku: 'LIB-CIE-04', nombre: 'Ciencias de la Naturaleza 4to Grado', descripcion: 'Libro de experimentos y teoría', precio_usd: 13.50, stock_minimo: 5, stock_inicial: 40 },
  { codigo_sku: 'LIB-ING-05', nombre: 'English Activity Book 5to Grado', descripcion: 'Cuaderno de trabajo de inglés', precio_usd: 16.00, stock_minimo: 8, stock_inicial: 60 },
  { codigo_sku: 'UTI-CUA-01', nombre: 'Cuaderno Espiral de Cuadritos', descripcion: '100 hojas cuadrícula 0.5cm', precio_usd: 1.80, stock_minimo: 10, stock_inicial: 120 },
  { codigo_sku: 'UTI-COL-01', nombre: 'Caja de Colores 24 uds.', descripcion: 'Lápices de colores de madera escolares', precio_usd: 4.50, stock_minimo: 10, stock_inicial: 80 },
  { codigo_sku: 'UTI-LAP-01', nombre: 'Caja de Lápices Grafito', descripcion: 'Caja de 12 lápices escolares HB2', precio_usd: 2.20, stock_minimo: 15, stock_inicial: 100 },
  { codigo_sku: 'LIB-DIC-01', nombre: 'Diccionario Básico Larousse', descripcion: 'Diccionario escolar de español', precio_usd: 8.50, stock_minimo: 5, stock_inicial: 35 },
  { codigo_sku: 'UTI-MOR-01', nombre: 'Morral Escolar Reforzado', descripcion: 'Bolso reforzado con costuras dobles', precio_usd: 22.00, stock_minimo: 3, stock_inicial: 15 },
];

async function main() {
  console.log('Iniciando carga de inventario escolar provisional...');

  for (const item of items) {
    // 1. Insertar o actualizar el producto
    const { data: prod, error: errProd } = await supabase
      .from('productos')
      .upsert({
        codigo_sku: item.codigo_sku,
        nombre: item.nombre,
        descripcion: item.descripcion,
        precio_usd: item.precio_usd,
        stock_minimo: item.stock_minimo,
        estado: true
      }, { onConflict: 'codigo_sku' })
      .select()
      .single();

    if (errProd) {
      console.error(`Error al insertar ${item.codigo_sku}:`, errProd.message);
      continue;
    }

    console.log(`✓ Producto ${item.codigo_sku} insertado con ID: ${prod.id}`);

    // 2. Verificar si ya tiene movimientos
    const { count, error: errCount } = await supabase
      .from('movimientos_inventario')
      .select('*', { count: 'exact', head: true })
      .eq('producto_id', prod.id);

    if (errCount) {
      console.error(`Error al contar movimientos de ${item.codigo_sku}:`, errCount.message);
      continue;
    }

    // Si no tiene movimientos, insertar carga inicial
    if (count === 0 && item.stock_inicial > 0) {
      const { error: errMov } = await supabase
        .from('movimientos_inventario')
        .insert({
          producto_id: prod.id,
          tipo: 'entrada',
          cantidad: item.stock_inicial,
          motivo: 'Carga inicial de inventario escolar'
        });

      if (errMov) {
        console.error(`Error al insertar movimiento para ${item.codigo_sku}:`, errMov.message);
      } else {
        console.log(`  → Carga inicial de ${item.stock_inicial} unidades registrada.`);
      }
    }
  }

  console.log('¡Seeding completado con éxito!');
}

main();
