import PATH from 'path';
import {promises as fs} from 'fs';
import { COMMA_HOME } from '../constant';
import { mkdir } from '../utils/mkdir';

const CACHE_VOLUME = 3;
const dir = PATH.join(COMMA_HOME, 'records');
mkdir(dir);
const RECORD_FILE = PATH.join(dir, 'records.json');

type Record = {
    file: string;
    type: 'pdf' | 'video';
    progress: any;
    timestamp?: number;
};

type RecordCache = {[key: string]: Record};

let recordCache: RecordCache = {

};

const loadFromCache = async () => {
    try {
        const buf = await fs.readFile(RECORD_FILE);
        return (JSON.parse(buf.toString()) as RecordCache);
    } catch {
        return {} as RecordCache;
    }
}

const loadCachePromise = loadFromCache().then(cache => recordCache = cache);

export const saveRecord = async (record: Record) => {
    await loadCachePromise;
    recordCache[record.file] = {...record, timestamp: Date.now().valueOf()};

    const records = Object.values(recordCache);
    if (records.length > CACHE_VOLUME) {
        const recordToClear = records.sort((a, b) => a.timestamp! - b.timestamp!)[0];
        delete recordCache[recordToClear.file];
    }
    return fs.writeFile(RECORD_FILE, JSON.stringify(recordCache));
}

export const getRecords = async () => {
    await loadCachePromise;
    const records = Object.values(recordCache);
    return records.sort((a, b) => b.timestamp! - a.timestamp!);
};
