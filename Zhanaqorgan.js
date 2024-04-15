require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

const botToken = "7125595752:AAHg9FAZDebLukWU6W88W1jLjOtZCa5XhzE";
const mongodbURI = "mongodb+srv://Damir2:Damir_04@cluster0.ffeliay.mongodb.net/Zhanaqorgan?retryWrites=true&w=majority&appName=Cluster0";
const bot = new TelegramBot(botToken, { polling: true });

// Подключение к MongoDB
mongoose.connect(mongodbURI);
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('Connected to MongoDB');
});

// Модель для пользователей
const User = mongoose.model('User', { username: String, isAdmin: Boolean });
const Informations = mongoose.model('Informations', { type: String, name: String, address: String, phone: String, working_hours: String, instagram: String });
const opts = {
    reply_markup: {
        keyboard: [
            ['Дүкендер'],
            ['Аптека'],
            ['Құрылыс дүкені'],
            ['Мейрамхана'],
            ['Электрик'],
            ['Сантехник'],
            ['ПС'],
            ['Қонақ үй'],
            ['Шаштараз'],
            ['Жем'],
            ['Fast food'],
            ['Оптика'],
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    }
};
const commands = [
    { command: "start", description: "Мәзір" },
    { command: "admin", description: "Жазбаны өзгерту" },
];

bot.setMyCommands(commands).then(() => {
    console.log('Команды бота успешно обновлены');
}).catch((error) => {
    console.error('Ошибка обновления команд бота:', error);
});
// Команда /start для новых пользователей
bot.onText(/\/start/, async(msg) => {
    const chatId = msg.chat.id;
    const username = msg.chat.username;
    let user = await User.findOne({ username });

    if (!user && (msg.chat.username === "damiraitbay")) {
        // Создание нового пользователя
        user = new User({ username, isAdmin: true });
        await user.save();
    } else if (!user) {
        user = new User({ username, isAdmin: false });
        await user.save();
    }
    if (user.isAdmin) { bot.sendMessage(chatId, `Ақпарат қосу үшін /admin батырмасын басыңыз`); } else {
        bot.sendMessage(chatId, `Сәлем, Қандай ақпарат білгіңіз келеді?`, opts);
    }
});

// Пример команды для админа
bot.onText(/\/admin/, async(msg) => {
    const chatId = msg.chat.id;
    const username = msg.chat.username;
    let user = await User.findOne({ username });

    if (user && user.isAdmin) {
        bot.sendMessage(chatId, `Сәлем, ${username}!. Қай жерге ақпарат қосқыңыз келеді`, opts);

        const waitForUserResponse = () => {
            return new Promise((resolve) => {
                bot.once('message', (responseMsg) => {
                    resolve(responseMsg.text);
                });
            });
        };
        const establishmentType = await waitForUserResponse(chatId);
        if (['Дүкендер', 'Аптека', 'Құрылыс дүкені', 'Мейрамхана', 'Электрик', 'Сантехник', 'ПС', 'Қонақ үй', 'Шаштараз', 'Жем', 'Оптика', 'Fast food'].includes(establishmentType)) {
            await bot.sendMessage(chatId, 'Есімі:');
            const establishment_name = await waitForUserResponse(chatId);
            await bot.sendMessage(chatId, 'Мекен-жайы:');
            const establishment_address = await waitForUserResponse(chatId);
            await bot.sendMessage(chatId, 'Телефон номері: Формат(+77717547898)');
            const establishment_phone = await waitForUserResponse(chatId);
            await bot.sendMessage(chatId, 'Жұмыс уақыты: Формат(10:00-22:00)');
            const establishment_hours = await waitForUserResponse(chatId);
            await bot.sendMessage(chatId, 'Инстаграммға сілтеме жіберіңіз');
            const establishment_instagram = await waitForUserResponse(chatId);
            const establishmentData = {
                type: establishmentType,
                name: establishment_name,
                address: establishment_address,
                phone: establishment_phone,
                working_hours: establishment_hours,
                instagram: establishment_instagram
            };

            // Сохраняем информацию в базу данных
            const newEstablishment = new Informations(establishmentData);
            await newEstablishment.save();
            bot.sendMessage(chatId, `${establishmentType} үшін ақпарат сәтті қосылды. Өшіру үшін /delete командасын басыңыз`);
        }
    } else {
        bot.sendMessage(chatId, `Сізде администратор құқығы жоқ.`);
    }
});
bot.onText(/\/delete/, async(msg) => {
    const chatId = msg.chat.id;
    const username = msg.chat.username;
    let user = await User.findOne({ username });

    if (user && user.isAdmin) {
        bot.sendMessage(chatId, `Өшіру керек ақпаратты таңдаңыз`, opts);

        const waitForUserResponse = () => {
            return new Promise((resolve) => {
                bot.once('message', (responseMsg) => {
                    resolve(responseMsg.text);
                });
            });
        };
        const establishmentType = await waitForUserResponse(chatId);
        if (['Дүкендер', 'Аптека', 'Құрылыс дүкені', 'Мейрамхана', 'Электрик', 'Сантехник', 'ПС', 'Қонақ үй', 'Шаштараз', 'Жем', 'Оптика', 'Fast food'].includes(establishmentType)) {
            await bot.sendMessage(chatId, 'Есімі:');
            const establishment_name = await waitForUserResponse(chatId);
            Informations.deleteOne({ name: establishment_name })
                .then((result) => {
                    if (result.deletedCount > 0) {
                        bot.sendMessage(chatId, `Жазба сәтті жойылды`);
                    } else {
                        console.log('Запись не найдена или не была удалена.');
                    }
                })
                .catch((err) => {
                    console.error('Ошибка удаления:', err);
                });

        }
    } else {
        bot.sendMessage(chatId, `Сізде администратор құқығы жоқ.`);
    }
});

bot.on('message', async(msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const username = msg.chat.username;
    let user = await User.findOne({ username });
    const establishments = await Informations.find({ type: messageText }).exec();
    if (establishments.length === 0 && !('/start' || '/admin')) {
        bot.sendMessage(chatId, `Әзірге бұл мәзір бойынша ақпарат жоқ`);
    } else if (['Дүкендер', 'Аптека', 'Құрылыс дүкені', 'Мейрамхана', 'Электрик', 'Сантехник', 'ПС', 'Қонақ үй', 'Шаштараз', 'Жем', 'Оптика', 'Fast food'].includes(messageText) && !user.isAdmin) {
        let message = `🔹 <b>${messageText}</b>:\n\n`;
        establishments.forEach((establishment) => {
            message += `<i>Аты</i>: <b>${establishment.name}</b>\n`;
            message += `<i>Адресі</i>: ${establishment.address}\n`;
            message += `<i>Телефон</i>: ${establishment.phone}\n`;
            message += `<i>instagram</i>: ${establishment.instagram}\n`;
            message += `<i>Жұмыс уақыты</i>: ${establishment.working_hours}\n\n`;
        });
        bot.sendMessage(chatId, message, { parse_mode: "HTML" });
    }

});