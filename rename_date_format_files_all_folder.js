// convert note name into a serialized date and put into a folderr
// DONE - from:  checklist: 01-Jan-2023 -> {dailyFolder}/2023/01/2023-01-01/2023-01-01
// DONE - from: {FROM folder}-{parametrizableFunctionThatCapturesByTitle} -> {parametrizableFolder}/{parametrizableFunctionThatReturnsPath}

const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

const throwError = message => { throw new Error(message); };

const isANumber = value => !isNaN(Number(value));

const ensureTwoDigits = value => value.length === 1 && isANumber(value) ? `0${value}` : value;

const monthToNumberStr = month => ({
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
}[month] || throwError(`Invalid month: ${month}`));

const buildNewPathfile = ({ day, month, year }) => {
    const monthNumber = monthToNumberStr(month);
    const fullDay = `${year}-${monthNumber}-${ensureTwoDigits(day)}`;
    return `${year}/${monthNumber}/${fullDay}/${fullDay}`;
};

const buildNewTp = async ({ file, tp }) => {
    const tfile = await tp.file.find_tfile(file.path);
    console.log(`tfile name: ${tfile.name}`);
    console.log(`tfile path: ${tfile.path}`);
    return { ...tp, file: tfile };
};

const isCorrectToBeFormat = ({ day, month, year }) => {
    const res = {
        day: isANumber(day) && (ensureTwoDigits(day).length === 2),
        month: !isANumber(month) && month.length === 3,
        year: isANumber(year) && year.length === 4
    }
    console.log(`Is correctformat: day=${day}:${res.day}, month=${month}:${res.month}, year=${year}:${res.year}`);
    return res.day && res.month && res.year;
}

const isAlreadyFormatted = ({ day, month, year }) => {
    //in correct format - first part is year - second is month and third is day
    const res = {
        day: isANumber(year) && year.length === 2,
        month: isANumber(month) && month.length === 2,
        year: isANumber(day) && day.length === 4
    }
    console.log(`Is already formatted: day=${day}:${res.day}, month=${month}:${res.month}, year=${year}:${res.year}`);
    return res.day && res.month && res.year;
}

const rename_format_daily_file = ({ tp, outputFolder, moveFn }) => {
    const [day, month, year] = tp.file.name.split('.md')[0].split('-');
    console.log("split filename", day, month, year);

    if (!day || !month || !year) return "wrong format";
    if (isAlreadyFormatted({ day, month, year })) return "already formatted";
    if (isCorrectToBeFormat({ day, month, year })) {
        const newName = `${outputFolder}${buildNewPathfile({ day, month, year })}`;
        return moveFn(newName).then(() => "success");
    }
    return "wrong format";
};

const rename_format_daily_file_all_folder = async ({ tp, app }, { inputFolder, outputFolder }) => {
    console.log(`inputFolder: ${inputFolder}, outputFolder: ${outputFolder}`);

    const findFile = path => tp.file.find_tfile(path);
    const moveFile = (newName, currentFile) => tp.file.move(newName, currentFile);

    const processFile = async file => {
        const updatedTp = await buildNewTp({ file, tp });
        const result = await rename_format_daily_file({
            tp: updatedTp,
            outputFolder,
            moveFn: newName => {
                const currentFile = findFile(file.path);
                console.log(`Moving [${currentFile.path}] to [${newName}]`);
                return moveFile(newName, currentFile);
            }
        });
        return `- [[${file.name}]]: ${result}`;
    };

    const categorizeResults = results => results.reduce((acc, result) => {
        const category = result.includes("already formatted") ? "already_formatted" :
            result.includes("wrong format") ? "wrong_format" : "updated";
        acc[category].push(result);
        return acc;
    }, { updated: [], wrong_format: [], already_formatted: [] });

    const formatResults = categorizedResults =>
        Object.entries(categorizedResults)
            .map(([category, items]) => `\n${category}: {\n${items.join('\n')}\n}`)
            .join('');

    const files = app.vault.getMarkdownFiles().filter(file => file.path.includes(inputFolder));
    const results = await Promise.all(files.map(processFile));

    return pipe(categorizeResults, formatResults)(results);
};

module.exports = rename_format_daily_file_all_folder;