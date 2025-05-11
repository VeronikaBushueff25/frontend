import axios from 'axios';
import { Item } from '../types/Item';

//const API_URL = 'http://localhost:3000'; // локальный

const API_URL = 'https://backend-production-f6e7.up.railway.app';

// Получение списка элементов
export const fetchItems = async (
    search: string,
    offset: number,
    limit: number = 20,
    useStoredOrder: boolean = true
): Promise<Item[]> => {
    const res = await axios.get(
        `${API_URL}/items?search=${encodeURIComponent(search)}&offset=${offset}&limit=${limit}&useStoredOrder=${useStoredOrder}`
    );
    return res.data.items;
};

// Загрузка ID элементов частями
export const fetchItemIdsChunk = async (
    chunk: number = 0,
    chunkSize: number = 5000
): Promise<{
    ids: number[],
    chunk: number,
    totalChunks: number,
    total: number
}> => {
    const res = await axios.get(
        `${API_URL}/items/ids?chunk=${chunk}&size=${chunkSize}`
    );
    return res.data;
};

// Загрузка всех ID элементов по частям
export const fetchAllItemIds = async (): Promise<number[]> => {
    let allIds: number[] = [];
    let chunk = 0;
    let totalChunks = 1;

    do {
        const response = await fetchItemIdsChunk(chunk);
        allIds = [...allIds, ...response.ids];
        totalChunks = response.totalChunks;
        chunk++;
    } while (chunk < totalChunks);

    return allIds;
};

// Получение части пользовательского порядка
export const fetchCustomOrderChunk = async (
    start: number = 0,
    count: number = 1000
): Promise<{
    orderSlice: number[],
    start: number,
    total: number
}> => {
    const res = await axios.get(
        `${API_URL}/items/custom-order?start=${start}&count=${count}`
    );
    return res.data;
};

// Сохранение только изменения порядка (вместо всего массива)
export const saveOrderChange = async (
    itemId: number,
    oldIndex: number,
    newIndex: number,
    selectedIds: number[] = []
) => {
    await axios.post(`${API_URL}/items/save-state`, {
        selectedIds,
        orderChanges: {
            itemId,
            oldIndex,
            newIndex
        }
    });
};

// Сохранение состояния (выбранные ID и порядок)
export const saveState = async (selectedIds: number[], customOrder: number[] = []) => {
    if (customOrder.length > 5000) {
        await axios.post(`${API_URL}/items/save-state`, { selectedIds });
    } else {
        await axios.post(`${API_URL}/items/save-state`, { selectedIds, customOrder });
    }
};

// Загрузка состояния
export const loadState = async () => {
    const res = await axios.get(`${API_URL}/items/get-state`);
    return res.data;
};
