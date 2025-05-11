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

// Сохранение только изменения порядка (вместо всего массива)
export const saveOrderChange = async (
    itemId: number,
    oldIndex: number,
    newIndex: number,
    selectedIds: number[] = [],
    search: string = ''
) => {
    await axios.post(`${API_URL}/items/save-state`, {
        selectedIds,
        orderChanges: {
            itemId,
            oldIndex,
            newIndex
        },
        search
    });
};

// Сохранение состояния (выбранные ID и порядок)
export const saveState = async (selectedIds: number[], customOrder: number[] = [], search: string = '') => {
    if (customOrder.length > 5000) {
        await axios.post(`${API_URL}/items/save-state`, { selectedIds, search });
    } else {
        await axios.post(`${API_URL}/items/save-state`, { selectedIds, customOrder, search });
    }
};

// Загрузка состояния
export const loadState = async () => {
    const res = await axios.get(`${API_URL}/items/get-state`);
    return res.data;
};