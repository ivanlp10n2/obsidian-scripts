// convert note name into a serialized date and put into a folderr
// DONE - from:  checklist: 01-Jan-2023 -> {dailyFolder}/2023/01/2023-01-01/2023-01-01
// DONE - from: {FROM folder}-{parametrizableFunctionThatCapturesByTitle} -> {parametrizableFolder}/{parametrizableFunctionThatReturnsPath}

// Utility functions
const throwError = (message) => {
    console.error(message);
    throw new Error(message);
};

const isANumber = (value) => !isNaN(Number(value));

const ensureTwoDigits = (value) =>
    value.length === 1 ? `0${value}` : value;

// Date formatting functions
const monthToNumberStr = (month) => {
    const mapOfMonths = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
    };
    return mapOfMonths[month] || throwError(`Invalid month: ${month}`);
};

const buildNewPathfile = (day, month, year) => {
    const monthNumber = monthToNumberStr(month);
    const fullDay = `${year}-${monthNumber}-${ensureTwoDigits(day)}`;
    return `${year}/${monthNumber}/${fullDay}/${fullDay}`;
};

// File operations
const buildNewTp = async (file, tp) => {
    const tfile = await tp.file.find_tfile(file.path);
    console.log(`tfile name: ${tfile.name}`);
    console.log(`tfile path: ${tfile.path}`);
    return { ...tp, file: tfile };
};

// Validation functions
const isCorrectToBeFormat = (day, month, year) => {
    const isDay = isANumber(day) && (day.length === 1 || day.length === 2);
    const isMonth = !isANumber(month) && month.length === 3;
    const isYear = isANumber(year) && year.length === 4;
    console.log(`isDay: ${day}-${isDay}, isMonth: ${month}-${isMonth}, isYear: ${year}-${isYear}`);
    return isDay && isMonth && isYear;
};

const isAlreadyFormatted = (day, month, year) => {
    const isDay = isANumber(day) && day.length === 2;
    const isMonth = isANumber(month) && month.length === 2;
    const isYear = isANumber(year) && year.length === 4;
    return isDay && isMonth && isYear;
};

// Main functions
const rename_format_daily_file = async (
    tp,
    outputFolder,
    moveFn
) => {
    const [day, month, year] = tp.file.name.split('.md')[0].split('-');

    if (!day || !month || !year) return "wrong format";
    if (isAlreadyFormatted(year, month, day)) return "already formatted";
    if (isCorrectToBeFormat(day, month, year)) {
        const newName = `${outputFolder}${buildNewPathfile(day, month, year)}`;
        return moveFn(newName);
    }
    return "wrong format";
};

const rename_format_daily_file_all_folder = async (
    { tp, app },
    { inputFolder, outputFolder }
) => {
    console.log(`inputFolder: ${inputFolder}, outputFolder: ${outputFolder}`);
    const findFile = (path) => tp.file.find_tfile(path)
    const moveFile = (newName, currentFile) => tp.file.move(newName, currentFile)

    const files = app.vault.getMarkdownFiles().filter(file => file.path.includes(inputFolder));
    const results = await Promise.all(files.map(async (file) => {
        const updatedTp = await buildNewTp(file, tp);
        const result = await rename_format_daily_file(updatedTp, outputFolder, (newName) => {
            const currentFile = findFile(file.path);
            console.log(`Moving [${currentFile.path}] to [${newName}]`);
            return moveFile(newName, currentFile);
        });
        return `- [[${file.name}]]: ${result}`;
    }));

    const categorizedResults = results.reduce((acc, result) => {
        const category = result.includes("already formatted") ? "already_formatted" :
            result.includes("wrong format") ? "wrong_format" :
            "updated";
        acc[category].push(result);
        return acc;
    }, { updated: [], wrong_format: [], already_formatted: [] });

    return Object.entries(categorizedResults)
        .map(([category, items]) => `\n${category}: {\n${items.join('\n')}\n}`)
        .join('');
};

module.exports = rename_format_daily_file_all_folder;