import axios from 'axios';
import { Item } from '../types/Item';

//const API_URL = 'http://localhost:3000'; // локальный

const API_URL = 'https://backend-production-f6e7.up.railway.app';

// Получение списка элементов
export const fetchItems = async (
    search: string,
    offset: number,
    limit: number = 20,
    customOrder: number[] = []
): Promise<Item[]> => {
    const res = await axios.get(`${API_URL}/items?search=${encodeURIComponent(search)}&offset=${offset}&limit=${limit}&customOrder=${customOrder.join(',')}`);
    return res.data.items;
};

// Сохранение состояния (выбранные ID и порядок)
export const saveState = async (selectedIds: number[], customOrder: number[]) => {
    await axios.post(`${API_URL}/items/save-state`, { selectedIds: Array.from(selectedIds), customOrder });
};

// Загрузка состояния
export const loadState = async () => {
    const res = await axios.get(`${API_URL}/items/get-state`);
    return res.data;
};
