const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR code received, scan it with the WhatsApp app.');
});

client.on('ready', () => {
    console.log('Client is ready!');
});

let orderState = {}; // Almacena el estado del pedido por número de teléfono

client.on('message', async (message) => {
    // Filtra mensajes de broadcast
    if (message.from.startsWith('status@broadcast')) {
        return;
    }

    console.log(`Message from ${message.from}: ${message.body}`);

    const chatId = message.from;

    if (!orderState[chatId]) {
        orderState[chatId] = { step: 'greeting' };
    }

    const state = orderState[chatId];

    switch (state.step) {
        case 'greeting':
            await message.reply('¡Hola! Bienvenido a nuestro restaurante de comida rápida. ¿Qué te gustaría pedir hoy? Responde con "menú" para ver nuestras opciones.');
            orderState[chatId].step = 'show_menu';
            break;
        
        case 'show_menu':
            if (['menú', 'menu'].includes(message.body.toLowerCase())) {
                await message.reply('Tenemos hamburguesas, papas fritas y bebidas. ¿Qué deseas pedir? Responde con "hamburguesa", "papas fritas" o "bebida".');
                orderState[chatId].step = 'take_order';
            } else {
                await message.reply('Por favor, responde con "menú" para ver nuestras opciones.');
            }
            break;

        case 'take_order':
            if (['hamburguesa', 'papas fritas', 'bebida'].includes(message.body.toLowerCase())) {
                orderState[chatId].order = message.body.toLowerCase();
                await message.reply(`¡Genial! Has pedido ${message.body}. ¿Confirmas tu pedido? Responde con "sí" para confirmar o "no" para cancelar.`);
                orderState[chatId].step = 'confirm_order';
            } else {
                await message.reply('Por favor, selecciona un ítem del menú: "hamburguesa", "papas fritas" o "bebida".');
            }
            break;

        case 'confirm_order':
            if (message.body.toLowerCase() === 'sí') {
                // Envía la información del pedido a un encargado
                const encargadoChatId = '573153795472@c.us'; // Número del encargado en formato correcto
                const orderDetails = `Nuevo pedido:\n\nCliente: ${chatId}\nPedido: ${orderState[chatId].order}`;
                try {
                    await client.sendMessage(encargadoChatId, orderDetails);
                    await message.reply('¡Tu pedido ha sido confirmado! Un miembro de nuestro equipo se pondrá en contacto contigo pronto.');
                } catch (error) {
                    console.error('Error al enviar el mensaje al encargado:', error);
                    await message.reply('Hubo un problema al confirmar tu pedido. Por favor, intenta nuevamente más tarde.');
                }
                delete orderState[chatId]; // Resetea el estado
            } else if (message.body.toLowerCase() === 'no') {
                await message.reply('Tu pedido ha sido cancelado. Responde "menú" para hacer un nuevo pedido.');
                delete orderState[chatId]; // Resetea el estado
            } else {
                await message.reply('Por favor, responde con "sí" para confirmar o "no" para cancelar.');
            }
            break;

        default:
            await message.reply('Lo siento, no entiendo esa opción. Responde con "menú" para ver nuestras opciones.');
            break;
    }
});

client.initialize();


