# Мессенджер

Приложение для обмена сообщениями в реальном времени, разработанное с использованием React, Node.js, Express, Socket.IO и PostgreSQL. Позволяет пользователям регистрироваться, входить в систему, создавать личные или групповые чаты, отправлять сообщения, загружать изображения/видео, добавлять реакции к сообщениям и получать уведомления в реальном времени.

## Возможности

- **Аутентификация пользователей**: Регистрация и вход по имени пользователя и паролю (на основе JWT).
- **Обмен сообщениями в реальном времени**: Отправка и получение сообщений через Socket.IO.
- **Личные и групповые чаты**: Создание чатов один-на-один или групповых.
- **Загрузка медиа**: Отправка изображений (JPEG, PNG) и видео (MP4).
- **Реакции на сообщения**: Добавление эмодзи-реакций (лайк, сердце, дизлайк, смех).
- **Уведомления**: Уведомления о новых сообщениях в реальном времени.
- **Поиск сообщений**: Поиск сообщений внутри чата.
- **Адаптивный интерфейс**: Разработан с использованием React для удобного взаимодействия.

## Технологии

### Фронтенд

- **React**: Библиотека для создания пользовательского интерфейса.
- **React Router**: Клиентская маршрутизация.
- **Axios**: HTTP-запросы для взаимодействия с API.
- **Socket.IO-Client**: Подключение к WebSocket для реального времени.
- **Vite**: Инструмент сборки для быстрой разработки.

### Бэкенд

- **Node.js и Express**: REST API и сервер.
- **Socket.IO**: Двусторонняя связь в реальном времени.
- **PostgreSQL**: База данных для хранения пользователей, чатов, сообщений и реакций.
- **JWT**: Аутентификация и авторизация.
- **Bcrypt**: Хэширование паролей.
- **Multer**: Обработка загрузки файлов.
- **dotenv**: Управление переменными окружения.

## Структура проекта

```
messenger-app/
├── backend/
│   ├── config/
│   │   └── db.js           # Настройка подключения к PostgreSQL
│   ├── controllers/
│   │   └── auth.js         # Логика аутентификации (регистрация, вход)
│   ├── routes/
│   │   ├── auth.js         # Маршруты аутентификации
│   │   ├── chats.js        # Маршруты для управления чатами
│   │   ├── messages.js     # Маршруты для работы с сообщениями
│   │   └── users.js        # Маршруты для пользователей
│   ├── uploads/            # Папка для загруженных файлов
│   ├── .env                # Переменные окружения
│   ├── package.json        # Зависимости бэкенда
│   └── server.js           # Основной сервер (Express и Socket.IO)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.js     # Интерфейс чата и логика WebSocket
│   │   │   ├── ChatList.js # Список чатов и уведомления
│   │   │   ├── Chat.css    # Стили для чата
│   │   │   └── ChatList.css# Стили для списка чатов
│   │   ├── App.js          # Главный компонент с маршрутизацией и аутентификацией
│   │   ├── App.css         # Глобальные стили
│   │   └── index.js        # Точка входа
│   ├── package.json        # Зависимости фронтенда
│   └── vite.config.js      # Конфигурация Vite
├── README.md               # Документация проекта
```

## Требования

- **Node.js**: Версия 16.x или 18.x (рекомендуется LTS).
- **PostgreSQL**: Версия 12 или выше.
- **Git**: Для клонирования репозитория.

## Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/1vanch0s/messenger-app.git
cd messenger-app
```

### 2. Настройка бэкенда

1. Перейдите в папку бэкенда:

   ```bash
   cd backend
   ```

2. Установите зависимости:

   ```bash
   npm install
   ```

3. Создайте файл `.env` в папке `backend/`:

   ```env
   PORT=5000
   JWT_SECRET=your_JWT_secret
   DATABASE_URL=postgresql://username:password@localhost:5432/messenger
   ```

   Замените `username`, `password` и `messenger` на ваши данные PostgreSQL.

4. Настройте базу данных:

   - Создайте базу данных `messenger`:

     ```bash
     psql -U postgres
     CREATE DATABASE messenger;
     ```

   - Выполните SQL для создания таблиц:

     ```sql
     CREATE TABLE users (
         id SERIAL PRIMARY KEY,
         username VARCHAR(255) UNIQUE NOT NULL,
         password_hash VARCHAR(255) NOT NULL
     );
     
     CREATE TABLE chats (
         id SERIAL PRIMARY KEY,
         name VARCHAR(255),
         is_group BOOLEAN DEFAULT FALSE,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     
     CREATE TABLE chat_members (
         id SERIAL PRIMARY KEY,
         chat_id INTEGER REFERENCES chats(id),
         user_id INTEGER REFERENCES users(id),
         joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     
     CREATE TABLE messages (
         id SERIAL PRIMARY KEY,
         chat_id INTEGER REFERENCES chats(id),
         user_id INTEGER REFERENCES users(id),
         content TEXT,
         file_url VARCHAR(255),
         file_type VARCHAR(50),
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     
     CREATE TABLE reactions (
         id SERIAL PRIMARY KEY,
         message_id INTEGER REFERENCES messages(id),
         user_id INTEGER REFERENCES users(id),
         reaction_type VARCHAR(50),
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     
     CREATE TABLE message_views (
         id SERIAL PRIMARY KEY,
         message_id INTEGER REFERENCES messages(id),
         user_id INTEGER REFERENCES users(id),
         viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );
     ```

### 3. Настройка фронтенда

1. Перейдите в папку фронтенда:

   ```bash
   cd ../frontend
   ```

2. Установите зависимости:

   ```bash
   npm install
   ```

### 4. Установка зависимостей

Если `package.json` отсутствует или нужно установить зависимости вручную:

**Фронтенд**:

```bash
cd frontend
npm init -y
npm install react@17.0.2 react-dom@17.0.2 react-router-dom@6.3.0 axios@1.6.0 socket.io-client@2.4.0
npm install -D vite@5.2.0 @vitejs/plugin-react@4.3.2 eslint@8.0.1 eslint-plugin-react@7.24.0 eslint-plugin-react-hooks@4.2.0 eslint-plugin-react-refresh@0.4.3
```

**Бэкенд**:

```bash
cd backend
npm init -y
npm install express socket.io jsonwebtoken bcryptjs pg cors dotenv multer
npm install -D nodemon
```

## Запуск проекта

1. **Запустите бэкенд**:

   ```bash
   cd backend
   npm run dev
   ```

   Сервер будет работать на `http://localhost:5000`.

2. **Запустите фронтенд**:

   ```bash
   cd ../frontend
   npm start
   ```

   Откройте `http://localhost:3000` в браузере.

## Использование

1. **Регистрация/Вход**:
   - Зарегистрируйтесь, указав имя пользователя и пароль.
   - Войдите в систему с теми же данными.
2. **Создание чатов**:
   - Создайте личный чат, выбрав пользователя.
   - Создайте групповой чат, указав название и участников.
3. **Обмен сообщениями**:
   - Отправляйте текстовые сообщения.
   - Загружайте изображения или видео.
   - Добавляйте реакции (👍, ❤️, 👎, 😂) к сообщениям.
4. **Уведомления**:
   - Получайте уведомления о новых сообщениях в реальном времени.
5. **Поиск**:
   - Ищите сообщения в чате по ключевым словам.

## Устранение неполадок

- **Ошибка WebSocket** (`WebSocket is closed before the connection is established`):
  - Проверьте, сохраняется ли токен в `localStorage` (DevTools &gt; Application &gt; Local Storage).
  - Убедитесь, что `JWT_SECRET` в `.env` совпадает на сервере и при генерации токена.
  - Проверьте логи сервера: `node server.js`.
- **Токен не сохраняется**:
  - Проверьте консоль браузера и ответы API (`/api/auth/register`, `/api/auth/login`).
  - Убедитесь, что `App.js` сохраняет `res.data.token` в `localStorage`.
- **Ошибка базы данных**:
  - Проверьте `DATABASE_URL` в `.env`.
  - Выполните SQL-скрипт для создания таблиц.

## Контрибьютинг

1. Форкните репозиторий.
2. Создайте ветку для изменений: `git checkout -b feature/имя-фичи`.
3. Внесите изменения и закоммитьте: `git commit -m "Добавлена фича"`.
4. Отправьте в репозиторий: `git push origin feature/имя-фичи`.
5. Создайте Pull Request.