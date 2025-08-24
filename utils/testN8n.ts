// Función para probar manualmente los webhooks de n8n

export async function testN8nWebhooks() {
  const UPLOAD_URL = 'https://mvpoh-n8n.ew1xnt.easypanel.host/webhook/smartdash-upload'
  const STATUS_URL = 'https://mvpoh-n8n.ew1xnt.easypanel.host/webhook/smartdash-status'
  
  console.log('🧪 Probando webhooks de n8n...')
  
  // Test 1: Webhook de Upload (POST)
  try {
    console.log('1️⃣ Probando webhook de UPLOAD:', UPLOAD_URL)
    
    const formData = new FormData()
    formData.append('fileName', 'test.csv')
    formData.append('fileSize', '1000')
    formData.append('fileType', 'text/csv')
    formData.append('timestamp', Date.now().toString())
    
    const uploadResponse = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData
    })
    
    console.log('📤 Upload Status:', uploadResponse.status, uploadResponse.statusText)
    console.log('📤 Upload Headers:', Object.fromEntries(uploadResponse.headers))
    
    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json()
      console.log('✅ Upload Response:', uploadData)
    } else {
      const errorText = await uploadResponse.text()
      console.log('❌ Upload Error:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Error probando upload webhook:', error)
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Test 2: Webhook de Status (GET)
  try {
    console.log('2️⃣ Probando webhook de STATUS:', STATUS_URL)
    
    const statusResponse = await fetch(`${STATUS_URL}?fileId=test123`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📊 Status Status:', statusResponse.status, statusResponse.statusText)
    console.log('📊 Status Headers:', Object.fromEntries(statusResponse.headers))
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log('✅ Status Response:', statusData)
    } else {
      const errorText = await statusResponse.text()
      console.log('❌ Status Error:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Error probando status webhook:', error)
  }
  
  // Test 3: Probar URLs de test
  console.log('\n' + '='.repeat(50) + '\n')
  console.log('3️⃣ Probando URLs de TEST...')
  
  try {
    const testUploadUrl = 'https://mvpoh-n8n.ew1xnt.easypanel.host/webhook-test/smartdash-upload'
    const testResponse = await fetch(testUploadUrl, {
      method: 'POST',
      body: new FormData()
    })
    
    console.log('🧪 Test Upload Status:', testResponse.status, testResponse.statusText)
    
    if (testResponse.ok) {
      const testData = await testResponse.json()
      console.log('✅ Test Upload Response:', testData)
    }
    
  } catch (error) {
    console.error('❌ Error probando test webhook:', error)
  }
}

// Función para probar desde la consola del navegador
export function runN8nTest() {
  testN8nWebhooks().then(() => {
    console.log('🏁 Test de webhooks completado')
  })
}