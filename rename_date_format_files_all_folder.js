// convert note name into a serialized date and put into a folderr
// from (01-Jan-2023 -> 2023/01/2023-01-01/2023-01-01)

const throwError = (message) => {
    const error = new Error(message)
    console.error(message, error)
    throw error
}

const buildNewTp = async (file, tp) => {
    const tfile = await tp.file.find_tfile(file.path)
    const result = { ...tp, file: tfile }
    console.log(`tfile name: ${result.file.name}`)
    console.log(`tfile path: ${result.file.path}`)
    return result
}
const buildDependencies = (templateApi) => {
    const result = {
        filename: templateApi.file.name,
        filepath: templateApi.file.path,
        rename: async (newName) => renameFile(newName, templateApi),
        newDateFormat: (day, month, year) => buildNewPathfile(day, month, year),
    }
    return result
}
const renameFile = async (newName, tp) => {
    console.log(`renaming [${tp.file.title}] to [${newName}]`)
    await tp.file.move(newName)
}
const buildNewPathfile = (day, month, year) => {
    const monthToNumberStr = (month) => {
        const mapOfMonths = {
            'Jan': '01',
            'Feb': '02',
            'Mar': '03',
            'Apr': '04',
            'May': '05',
            'Jun': '06',
            'Jul': '07',
            'Aug': '08',
            'Sep': '09',
            'Oct': '10',
            'Nov': '11',
            'Dec': '12',
        }
        if (!mapOfMonths[month]) {
            throwError(`we're not moving [${filename}]`)
        }
        return mapOfMonths[month]
    }
    const monthNumber = monthToNumberStr(month)
    const fullDay = `${year}-${monthNumber}-${day}`
    const fullPath = `${year}/${monthNumber}/${fullDay}/${fullDay}.md`
    return fullPath
}
const isANumber = (value) => {
    return !isNaN(value) || !isNaN(Number(value))
}

const buildFlowBranches = (dependencies) => {
    return {
        createNewFormattedFile: async (day, month, year, rootFolderPath) => {
            const newName = `${rootFolderPath}${dependencies.newDateFormat(day, month, year)}`
            console.log(`renaming [${dependencies.filename}] to [${newName}]`)
            return new Promise(resolve => resolve("success"))
            // dependencies.rename(newName)
        },
        isCorrectToBeFormat: (day, month, year) => {
            const isDay = isANumber(day) && day.length == 2
            const isMonth = !isANumber(month) && month.length == 3
            const isYear = isANumber(year) && year.length == 4
            console.log(`isDay: ${day}-${isDay}, isMonth: ${month}-${isMonth}, isYear: ${year}-${isYear}`)
            return isDay && isMonth && isYear
        },
        isAlreadyFormatted: (day, month, year) => {
            const isDay = isANumber(day) && day.length == 2
            const isMonth = isANumber(month) && month.length == 2
            const isYear = isANumber(year) && year.length == 4
            return isDay && isMonth && isYear
        },
        throwErrorWrongFormat: (filename) => {
            console.warn(`filename is not correct format [${filename}]`)
            return `wrong format`
        },
        throwErrorAlreadyFormatted: (filename) => {
            console.warn(`filename is already formatted [${filename}]`)
            return `already formatted`
        },
    }
}
const printDependencies = (dependencies) => {
    console.log(`dependencies loaded:\n${JSON.stringify(dependencies)}`)
}

async function rename_format_daily_file(tp, dailyFolder) {
    if (tp == undefined) throwError("templater dependency is not provided as argument")
    if (dailyFolder == undefined) throwError("dailyFolder is not provided as argument")
    const dependencies = buildDependencies(tp)
    printDependencies(dependencies)
    const branchs = buildFlowBranches(dependencies)
    const run = async () => {
        const filename = dependencies.filename.split('.md')[0]

        const [day, month, year] = filename.split('-')

        if (branchs.isAlreadyFormatted(year, month, day))
            return branchs.throwErrorAlreadyFormatted(filename)
        if (branchs.isCorrectToBeFormat(day, month, year)) {
            await branchs.createNewFormattedFile(day, month, year, dailyFolder)
            return "success"
        } else
            return branchs.throwErrorWrongFormat(filename)
    }
    try {
        return await run()
    } catch (e) {
        console.error("returning error ", e)
        return (e)
    }
}
async function rename_format_daily_file_all_folder({ tp, app }, dailyFolder) {
    let wrongFormat = []
    let alreadyFormatted = []
    let updated = []
    const files = getFolderMarkdown(tp, app)
    for (const file of files) {
        const wrongFormatMsg = () => `- [[${file.name}]]: wrong format`
        const alreadyFormattedMsg = () => `- [[${file.name}]]: already formatted`
        const successMsg = () => `- [[${file.name}]]: success`
        const updatedTp = await buildNewTp(file, tp)
        const result = await rename_format_daily_file(updatedTp, dailyFolder)
        console.log(`result: ${result}`)

        if (result == "success")
            updated.push(successMsg())
        else if (result == "wrong format") 
            wrongFormat.push(wrongFormatMsg())
        else if (result == "already formatted") 
            alreadyFormatted.push(alreadyFormattedMsg())
    }
    const buildList = (list) => {
        return list.join("\n")
    }

    console.log("updated list: ", buildList(updated))
    const results = {
        updated: buildList(updated),
        wrong_format: buildList(wrongFormat),
        already_formatted: buildList(alreadyFormatted),
    }
    const resultMsg = `\nupdated: {\n${(results.updated)}\n}` +
            `\nwrong_format: {\n${(results.wrong_format)}\n}` +
            `\nalready_formatted: {\n${(results.already_formatted)}\n}`

    return resultMsg
}

const getFolderMarkdown = (tp, app) => {
    const currentFolder = tp.file.folder(true);
    const filesInFolder = app.vault.getMarkdownFiles().filter(file => file.path.includes(currentFolder));
    return filesInFolder
}

module.exports = rename_format_daily_file_all_folder