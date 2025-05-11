import React, { useEffect, useState, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Form } from 'react-bootstrap';
import {fetchItems, saveState, loadState} from '../api/api';
import { Item } from '../types/Item';
import 'bootstrap/dist/css/bootstrap.min.css';

const LIMIT = 20;

const ItemList: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const loaderRef = useRef<HTMLDivElement | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const isFirstLoad = useRef(true);
    const isInitialized = useRef(false);

    // Загрузка следующей порции элементов
    const loadMore = useCallback(async (resetOffset = false) => {
        setLoading(true);
        const currentOffset = resetOffset ? 0 : offset;

        try {
            const newItems = await fetchItems(search, currentOffset, LIMIT, true);

            if (resetOffset) {
                setItems(newItems);
                setOffset(LIMIT);
            } else {
                setItems(prev => {
                    const existingIds = new Set(prev.map(item => item.id));
                    const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
                    return [...prev, ...uniqueNewItems];
                });
                setOffset(prev => prev + LIMIT);
            }

            if (newItems.length < LIMIT) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
        } catch (err) {
            console.error('Ошибка загрузки данных', err);
        } finally {
            setLoading(false);
        }
    }, [search, offset]);

    // Загрузка состояния с сервера и начальных данных
    useEffect(() => {
        const initializeData = async () => {
            try {
                const state = await loadState();
                setSelectedIds(new Set(state.selectedIds || []));
                isInitialized.current = true;
                await loadMore(true);
            } catch (err) {
                console.error('Ошибка инициализации данных', err);
            }
        };

        initializeData();
    }, [loadMore]);

    // Загрузка элементов при изменении поиска
    useEffect(() => {
        if (!isInitialized.current) return;

        const loadInitialItems = async () => {
            setItems([]);
            setOffset(0);
            setHasMore(true);
            await loadMore(true);
        };

        if (!isFirstLoad.current) {
            loadInitialItems();
        } else {
            isFirstLoad.current = false;
        }
    }, [search, loadMore]);

    // Наблюдатель для скролла
    useEffect(() => {
        if (loading || !hasMore) return;

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                loadMore();
            }
        });

        const current = loaderRef.current;
        if (current) observer.observe(current);

        return () => {
            if (current) observer.unobserve(current);
        };
    }, [loadMore, loading, hasMore]);

    // Обработчик DnD
    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        // Полностью блокируем функциональность перетаскивания при поиске
        if (search) {
            console.log('Перетаскивание отключено при активном поиске');
            return;
        }

        const reorderedItems = reorder(items, result.source.index, result.destination.index);
        setItems(reorderedItems);

        try {
            const draggedItemId = parseInt(result.draggableId);
            // Уменьшаем количество запрашиваемых элементов для оптимизации
            const fullSearchResults = await fetchItems('', 0, 5000, false);
            const fullOrder = [...fullSearchResults];
            const draggedIndex = fullOrder.findIndex(item => item.id === draggedItemId);

            if (draggedIndex !== -1) {
                const [moved] = fullOrder.splice(draggedIndex, 1);
                fullOrder.splice(result.destination.index, 0, moved);

                const customOrder = fullOrder.map(item => item.id);

                await saveState(Array.from(selectedIds), customOrder, '');
            }
        } catch (err) {
            console.error('Ошибка сохранения нового порядка', err);
            await loadMore(true);
        }
    };

    // Сортировка
    const reorder = (list: Item[], startIndex: number, endIndex: number): Item[] => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    // Обработчик поиска
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setItems([]);
        setOffset(0);
        setHasMore(true);
    };

    // Выбор
    const toggleSelect = async (id: number) => {
        const updated = new Set(selectedIds);
        if (updated.has(id)) {
            updated.delete(id);
        } else {
            updated.add(id);
        }
        setSelectedIds(updated);

        try {
            // При активном поиске не передаем строку поиска для сохранения порядка
            await saveState(Array.from(updated), [], '');
        } catch (err) {
            console.error('Ошибка сохранения выбранных элементов', err);
        }
    };

    return (
        <div className="p-4">
            <Form.Group className="mb-4">
                <Form.Control
                    type="text"
                    placeholder="Поиск..."
                    value={search}
                    onChange={handleSearch}
                    className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {search && (
                    <div className="text-danger mb-3 fw-bold">
                        🔒 Перетаскивание отключено при активном поиске
                    </div>
                )}
            </Form.Group>

            {items.length > 0 ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId={`droppable-list-${items.length}`} isDropDisabled={!!search}>
                        {(provided) => (
                            <ul {...provided.droppableProps} ref={provided.innerRef} className="list-unstyled">
                                {items.map((item, index) => (
                                    <Draggable
                                        key={item.id.toString()}
                                        draggableId={item.id.toString()}
                                        index={index}
                                        isDragDisabled={!!search}
                                    >
                                        {(provided, snapshot) => (
                                            <li
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`d-flex align-items-center gap-3 px-4 py-2 border rounded-lg bg-light shadow-sm mb-2 transition
                                                ${snapshot.isDragging ? 'bg-info bg-opacity-25 shadow-lg' : ''}`}
                                            >
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => toggleSelect(item.id)}
                                                    className="me-2"
                                                />
                                                <span className="text-dark">{item.value}</span>
                                            </li>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </ul>
                        )}
                    </Droppable>
                </DragDropContext>
            ) : loading ? (
                <div className="text-center py-4">Загрузка...</div>
            ) : (
                <div className="text-center py-4">Нет элементов</div>
            )}
            <div ref={loaderRef} />
        </div>
    );
};

export default ItemList;