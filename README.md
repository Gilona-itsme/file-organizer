
 File Organizer CLI

A simple command-line tool built with Node.js for analyzing, organizing, and cleaning up files.

[Українська версія](#українська-версія) | [English version](#english-version)

---

## Українська версія

### Про проєкт

**File Organizer CLI** — це консольний застосунок на Node.js для роботи з файлами та директоріями.
Проєкт дозволяє переглядати інформацію про файли, знаходити дублікати, сортувати файли за типами та знаходити старі файли, які можна видалити.
Цей проєкт створено для практики роботи з Node.js, файловою системою, асинхронним кодом і потоками.

### Можливості

**1. Scan — аналіз файлів**
- Підрахунок кількості файлів і їхнього загального розміру.
- Статистика за розширеннями.
- Інформація про вік файлів.
- Пошук трьох найбільших і найстарішого файлу.

**2. Duplicates — пошук дублікатів**
- Пошук однакових файлів за допомогою SHA-256.
- Групування дублікатів.
- Розрахунок обсягу дискового простору, який потенційно можна звільнити.

**3. Organize — сортування файлів**
- Копіювання файлів у папки за типами.
- Категорії: Documents, Images, Archives, Code, Videos та Other.
- Запобігання перезапису файлів з однаковими назвами.
- Потокове копіювання файлів розміром від 10 MB.

**4. Cleanup — пошук старих файлів**
- Пошук файлів, які не змінювалися протягом заданої кількості днів.
- Попередній перегляд файлів перед видаленням.
- Видалення лише за наявності прапорця `--confirm`.

### Технології

- Node.js
- JavaScript (ES Modules)
- File System (`fs`)
- EventEmitter
- Streams
- Crypto (SHA-256)
- Path

### Встановлення

Переконайтеся, що Node.js встановлений на вашому комп'ютері.

Клонуйте репозиторій:

```bash
git clone <https://github.com/Gilona-itsme/file-organizer.git>
```

Перейдіть до директорії проєкту:

```bash
cd file-organizer
```

Встановіть залежності (якщо вони передбачені проєктом):

```bash
npm install
```

## Використання

### Scan

```bash
npm run scan <directory>
```

### Duplicates

```bash
npm run duplicates <directory>
```

### Organize

```bash
npm run organize -- <directory> --output <target>
```

### Cleanup — попередній перегляд

```bash
npm run cleanup -- <directory> --older-than <days>
```

### Cleanup — підтверджене видалення

```bash
npm run cleanup -- <directory> --older-than <days> [--confirm]
```

> **Увага:** команда Cleanup з прапорцем `--confirm` видаляє файли без можливості відновлення засобами цього застосунку. Перед видаленням перевірте список знайдених файлів.

### Структура проєкту

file-organizer/
├── lib/
│   ├── scanner.js
│   ├── duplicates.js
│   ├── organizer.js
│   ├── cleanup.js
│   └── utils.js
├── file-organizer.js
├── package.json
├── README.md
└── .gitignore

## Tехнічні особливості

Проєкт побудований на модульному підході: логіка сканування, пошуку дублікатів, сортування та очищення винесена в окремі модулі.

- **EventEmitter** використовується для генерації подій та відстеження прогресу виконання операцій.
- **Streams** забезпечують потокову обробку великих файлів, починаючи з 10 MB.
- **SHA-256** використовується для перевірки вмісту файлів під час пошуку дублікатів.
- **Async/Await** забезпечує асинхронну роботу з файловою системою.
- **Error Handling** забезпечує обробку типових файлових помилок та виведення зрозумілих повідомлень.

### Аргументи команд

| Аргумент | Опис |
|---|---|
| `<directory>` | Директорія, яку потрібно обробити |
| `--output <directory>` | Директорія для збереження впорядкованих файлів |
| `--older-than <days>` | Вік файлів у днях для пошуку на очищення |
| `--confirm` | Підтверджує фактичне видалення файлів |
| `--help` | Показує довідку з командами |

### Чого я навчилася

Під час роботи над проєктом я практикувала:
- роботу з файловою системою в Node.js;
- асинхронні функції та обробку помилок;
- використання EventEmitter для відстеження подій;
- роботу з потоками для копіювання великих файлів;
- обчислення SHA-256 для пошуку дублікатів;
- створення CLI-команд та обробку аргументів.

---

# English Version

### About the Project

**File Organizer CLI** is a command-line application built with Node.js for working with files and directories.
It can analyze files, find duplicates, organize files by type, and identify old files that may be deleted.
This project was created to practice Node.js, file system operations, asynchronous programming, and streams.

### Features

**1. Scan — File Analysis**
- Counts files and calculates their total size.
- Groups files by extension.
- Provides file age statistics.
- Finds the three largest files and the oldest file.

**2. Duplicates — Duplicate Detection**
- Finds identical files using SHA-256 hashes.
- Groups duplicate files.
- Estimates the disk space that could be reclaimed.

**3. Organize — File Organization**
- Copies files into folders based on their types.
- Categories: Documents, Images, Archives, Code, Videos, and Other.
- Prevents overwriting files with identical names.
- Uses streams to copy files of 10 MB or larger.

**4. Cleanup — Old File Search**
- Finds files that have not been modified within a specified number of days.
- Shows matching files before deletion.
- Deletes files only when the `--confirm` flag is provided.

### Technologies

- Node.js
- JavaScript (ES Modules)
- File System (`fs`)
- EventEmitter
- Streams
- Crypto (SHA-256)
- Path

### Installation

Make sure Node.js is installed on your computer.

Clone the repository:

```bash
git clone <https://github.com/Gilona-itsme/file-organizer.git>
```

Navigate to the project directory:

```bash
cd file-organizer
```

Install dependencies (if required by the project):

```bash
npm install
```

## Usage

### Scan

```bash
npm run scan <directory>
```

### Duplicates

```bash
npm run duplicates <directory>
```

### Organize

```bash
npm run organize -- <directory> --output <target>
```

### Cleanup — Dry Run

```bash
npm run cleanup -- <directory> --older-than <days> 
```

### Cleanup — Confirmed Deletion

```bash
npm run cleanup -- <directory> --older-than <days> [--confirm]
```

> **Warning:** Cleanup with the `--confirm` flag permanently deletes matching files. Review the file list carefully before confirming deletion.

### Project structure

file-organizer/
├── lib/
│   ├── scanner.js
│   ├── duplicates.js
│   ├── organizer.js
│   ├── cleanup.js
│   └── utils.js
├── file-organizer.js
├── package.json
├── README.md
└── .gitignore

## Technical Highlights

The project follows a modular architecture, with scanning, duplicate detection, organization, and cleanup logic separated into dedicated modules.

- **EventEmitter** provides event-driven progress tracking and operation notifications.
- **Streams** enable memory-efficient processing of large files starting at 10 MB.
- **SHA-256** is used to compare file contents when detecting duplicates.
- **Async/Await** handles asynchronous file system operations.
- **Error Handling** provides handling for common file system errors and user-friendly error messages.

### Arguments of teams

| Argument | Description |
|---|---|
| `<directory>` |Directory to be processed |
| `--output <directory>` | Directory to save ordered files |
| `--older-than <days>` | Age of files in days to search for cleaning |
| `--confirm` | Confirms the actual deletion of files |
| `--help` | Shows help with commands |

### What I Learned

While working on this project, I practiced:
- working with the Node.js file system;
- asynchronous functions and error handling;
- using EventEmitter to track events;
- using streams to copy large files;
- calculating SHA-256 hashes to find duplicates;
- building CLI commands and parsing command-line arguments.