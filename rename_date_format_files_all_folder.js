// convert note name into a serialized date and put into a folderr
// DONE - from:  checklist: 01-Jan-2023 -> {dailyFolder}/2023/01/2023-01-01/2023-01-01
// DONE - from: {FROM folder}-{parametrizableFunctionThatCapturesByTitle} -> {parametrizableFolder}/{parametrizableFunctionThatReturnsPath}

const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

const throwError = message => { throw new Error(message); };

const stringifyObject = obj => JSON.stringify(obj, null, 2);

const isANumber = value => !isNaN(Number(value));

const ensureTwoDigits = value => value.length === 1 && isANumber(value) ? `0${value}` : value;

// Helper functions for date transformation (can be moved to a separate utility file if needed)
const monthToNumberStr = month => ({
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
}[month] || throwError(`Invalid month: ${month}`));

const renameAndMoveFile = async ({ tp, outputFolder, moveFn, matchStrategy, transformStrategy }) => {
    if (!matchStrategy(tp.file.name)) return "not matching";
    
    const newPathfile = transformStrategy(tp.file.name);
    if (!newPathfile) return "transform failed";
    
    const newName = `${outputFolder}${newPathfile}`;
    return moveFn(newName).then(result => result === "success" ? "success" : "skipped");
};


// Strategy definitions
const strategies = {
    match: {
        all: () => true,
        "date-DD-MMM-YYYY": filename => { // "15-Jun-2024.md"
            const [day, month, year] = filename.split('.md')[0].split(" ")[0].split('-');
            const validDay = day && ensureTwoDigits(day).length === 2 && isANumber(day);
            const validMonth = month && month.length === 3 && !isANumber(month);
            const validYear = year && year.length === 4 && isANumber(year);
            return validDay && validMonth && validYear;
        },
        recordings: filename => { // Recording 20240623122953 1.webm
            const str = filename.split('.webm')[0];
            const date = str.split(" ")[1];
            return filename.includes("Recording") && date && date.length === 14; // 20240623122953
        },
        "date-DD-MM-YYYY": filename => {// "15-01-2024 1.md"
            const [day, month, year] = filename.split('.md')[0].split(" ")[0].split('-');
            const validDay = day && day.length === 2 && isANumber(day);
            const validMonth = month && month.length === 2 && isANumber(month);
            const validYear = year && year.length === 4 && isANumber(year);
            return validDay && validMonth && validYear;
        },
        "date-YYYY-MM-DD": filename => { // "2024-01-15 1.md"
            const [year, month, day] = filename.split('.md')[0].split(" ")[0].split('-');
            const validYear = year && year.length === 4 && isANumber(year);
            const validMonth = month && month.length === 2 && isANumber(month);
            const validDay = day && day.length === 2 && isANumber(day);
            return validYear && validMonth && validDay;
        },
        images: filename => { // Pasted image 20240220145751.png
            return filename.includes("Pasted image") 
                && (filename.includes(".png") || 
                filename.includes(".jpg") || 
                filename.includes(".jpeg"));
        },
        // Add more matching strategies as needed
    },
    transform: {
        identity: filename => filename,
        "date-DD-MMM-YYYY": filename => { // "15-Jun-2024 1.md"
            const [day, month, year] = filename.split('.md')[0].split(" ")[0].split('-');
            const monthNumber = monthToNumberStr(month);
            const fullDay = `${year}-${monthNumber}-${ensureTwoDigits(day)}`;
            return `${year}/${monthNumber}/${fullDay}/${fullDay}`;
        },
        recordings: filename => { //Recording 20240623122953 1.webm
            const str = filename.split('.webm')[0];
            const date = str.split(" ")[1];
            const year = date.substring(0, 4);
            const month = date.substring(4, 6);
            const day = date.substring(6, 8);
            const fullDay = `${year}-${month}-${day}`;
            return `${year}/${month}/${fullDay}/${str}`;
        },
        "date-DD-MM-YYYY": filename => { // "15-01-2024 1.md"
            const [day, month, year] = filename.split('.md')[0].split(" ")[0].split('-');
            const fullDay = `${year}-${month}-${ensureTwoDigits(day)}`;
            return `${year}/${month}/${fullDay}/${fullDay}`;
        },
        "date-YYYY-MM-DD": filename => { // "2024-01-15 1.md" 
            const [year, month, day] = filename.split('.md')[0].split(" ")[0].split('-');
            const fullDay = `${year}-${month}-${day}`;
            return `${year}/${month}/${fullDay}/${fullDay}`;
        },
        images: filename => { // Pasted image 20240220145751.png
            const str = filename.split('.png')[0];
            const date = str.split(" ")[2];
            const year = date.substring(0, 4);
            const month = date.substring(4, 6);
            const day = date.substring(6, 8);
            const fullDay = `${year}-${month}-${day}`;
            return `${year}/${month}/${fullDay}/${str}`;
        },
        // Add more transformation strategies as needed
    }
};

const processAllFiles = async ({ tp, app }, config) => {
    console.log(`inputFolder: ${config.inputFolder}, outputFolder: ${config.outputFolder}`);

    const findFile = path => tp.file.find_tfile(path);
    const moveFile = (newName, currentFile) => {
        if (!config.override && app.vault.getAbstractFileByPath(`${newName}.md`)) {
            console.log(`File already exists: ${newName}. Skipping due to override being false.`);
            return Promise.resolve("skipped - file exists");
        }
        return tp.file.move(newName, currentFile);
    };
    const buildNewTp = async ({ file, tp }) => {
        const tfile = await tp.file.find_tfile(file.path);
        console.log(`tfile name: ${tfile.name}`);
        console.log(`tfile path: ${tfile.path}`);
        return { ...tp, file: tfile };
    }

    const processFile = async file => {
        console.log("processing file ", file.name);
        const updatedTp = await buildNewTp({ file, tp });
        const result = await renameAndMoveFile({
            tp: updatedTp,
            outputFolder: config.outputFolder,
            moveFn: newName => {
                const currentFile = findFile(file.path);
                console.log(`Transforming [${currentFile.path}] to [${newName}]`);
                return moveFile(newName, currentFile);
            },
            matchStrategy: config.matchStrategy,
            transformStrategy: config.transformStrategy
        });
        return `- [[${file.name}]]: ${result}`;
    };

    const categorizeResults = results => results.reduce((acc, result) => {
        const category = result.includes("not matching") ? "not_matching" :
            result.includes("transform failed") ? "transform_failed" 
            : result.includes("skipped") ? "already_exists"
            : "updated";
        acc[category].push(result);
        return acc;
    }, { updated: [], not_matching: [], transform_failed: [], already_exists: [] });

    const formatResults = categorizedResults =>
        Object.entries(categorizedResults)
            .map(([category, items]) => `\n${category}: {\n${items.join('\n')}\n}`)
            .join('');

    const files = app.vault.getFiles().filter(file => file.path.includes(config.inputFolder));
    console.log("files", files);
    const results = await Promise.all(files.map(processFile));

    return pipe(categorizeResults, formatResults)(results);
};

const main = async ({ tp, app }, clientConfig) => {
    const defaultConfig = {
        inputFolder: "🎁 life/📆 daily/📓 notes/script_test/poronga/",
        outputFolder: "🎁 life/📆 daily/📓 notes/script_test/poronga/",
        matchStrategy: strategies.match["date-DD-MMM-YYYY"],
        transformStrategy: strategies.transform["date-DD-MMM-YYYY"],
        override: false
    };

    //if strategy params are string find in strategies map
    if (typeof clientConfig.matchStrategy === 'string') {
        clientConfig.matchStrategy = strategies.match[clientConfig.matchStrategy];
    }
    if (typeof clientConfig.transformStrategy === 'string') {
        clientConfig.transformStrategy = strategies.transform[clientConfig.transformStrategy];
    }

    const config = { ...defaultConfig, ...clientConfig };

    if (!clientConfig) {
        throwError("Client config not defined.");
    }

    const result = await processAllFiles({ tp, app }, config);
    const msg = `
params: 
    input: ${config.inputFolder}
    output: ${config.outputFolder}
    matchStrategy: ${config.matchStrategy}
    transformStrategy: ${config.transformStrategy}
    override: ${config.override}
-----------------------------
results:
    ${result}
    `;
    return `\`\`\`\n${msg}\n\`\`\``;
};
/**
 USAGE: strategies can be a fixed strategy or a dynamic function
 <% tp.user.rename_date_format_files_all_folder(
	{ tp, app }, 
	{
	    'inputFolder': '🎁 life/📆 daily/📓 notes/script_test/', 
	    'outputFolder': '🎁 life/📆 daily/📓 notes/script_test',
		'override': false,
		'matchStrategy': 'date-DD-MMM-YYYY',
		'transformStrategy': 'date-DD-MMM-YYYY',
	}
)
 %>

 */

module.exports = main;