const test = async () => {
    new Promise((resolve, reject) => {
        console.log("test async function")
        resolve("test async function")
    })
    return "test async function"
}

module.exports = test;