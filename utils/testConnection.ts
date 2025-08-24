import { supabase } from '@/lib/supabase'

export async function testDatabaseConnection() {
  try {
    console.log('🧪 Probando conexión a Supabase...')
    
    // Probar conexión básica
    const { data, error } = await supabase
      .from('data_files')
      .select('*')
      .limit(1)
      
    if (error) {
      console.error('❌ Error al conectar:', error.message)
      return false
    }
    
    console.log('✅ Conexión exitosa a Supabase')
    console.log('📊 Estructura de tabla data_files:', data)
    return true
    
  } catch (error) {
    console.error('❌ Error de conexión:', error)
    return false
  }
}

export async function getTableSchema() {
  try {
    console.log('🔍 Obteniendo esquema de tabla data_files...')
    
    // Intentar insertar un registro de prueba para ver qué campos necesita
    const { data, error } = await supabase
      .from('data_files')
      .insert({
        name: 'test_schema',
        original_name: 'test.csv'
      })
      .select()
      .single()
      
    if (data) {
      console.log('✅ Estructura detectada:', Object.keys(data))
      // Eliminar el registro de prueba
      await supabase.from('data_files').delete().eq('id', data.id)
    }
    
    if (error) {
      console.log('📝 Error de esquema:', error.message)
      console.log('🔧 Esto nos ayuda a entender qué campos necesitamos')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}