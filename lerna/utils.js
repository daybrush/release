
/**
 * @type {<T>(arr: T[], callback: (item: T, index: number, arr: T[]) => Promise<any>) => void}
 * @returns {Promise<any>}
 */
exports.reduceChain = (arr, callback) => {
    return arr.reduce((chain, item, i) => {
        return chain.then(() => {
            return callback(item, i, arr);
        });
    }, Promise.resolve());
}
