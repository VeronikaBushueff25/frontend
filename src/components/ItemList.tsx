import React, { useEffect, useState, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Form } from 'react-bootstrap';
import { fetchItems, saveState, loadState, saveOrderChange } from '../api/api';
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
    const isInitialized = useRef(false);
    const canLoadMore = useRef(true);

    // Загрузка состояния с сервера и начальных данных
    useEffect(() => {
        const initializeData = async () => {
            try {
                const state = await loadState();
                setSelectedIds(new Set(state.selectedIds || []));
                isInitialized.current = true;
                await loadInitialItems();
            } catch (err) {
                console.error('Ошибка инициализации данных', err);
            }
        };

        initializeData();
    }, []);

    // Загрузка первоначальных элементов или при смене поиска
    const loadInitialItems = useCallback(async () => {
        // Сбрасываем состояние
        setItems([]);
        setOffset(0);
        setHasMore(true);
        canLoadMore.current = true;

        // Первая загрузка
        try {
            setLoading(true);
            const newItems = await fetchItems(search, 0, LIMIT, true);

            setItems(newItems);

            // Обновляем состояние загрузки
            if (newItems.length < LIMIT) {
                setHasMore(false);
                canLoadMore.current = false;
            } else {
                setOffset(LIMIT);
            }
        } catch (err) {
            console.error('Ошибка загрузки первоначальных данных', err);
            setHasMore(false);
            canLoadMore.current = false;
        } finally {
            setLoading(false);
        }
    }, [search]);

    // Загрузка дополнительных элементов
    const loadMoreItems = useCallback(async () => {
        // Проверяем возможность загрузки
        if (!canLoadMore.current || loading || !hasMore) return;

        try {
            setLoading(true);
            const newItems = await fetchItems(search, offset, LIMIT, true);

            // Обновляем список элементов
            setItems(prevItems => {
                const existingIds = new Set(prevItems.map(item => item.id));
                const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
                return [...prevItems, ...uniqueNewItems];
            });

            // Обновляем состояние загрузки
            if (newItems.length < LIMIT) {
                setHasMore(false);
                canLoadMore.current = false;
            } else {
                setOffset(prevOffset => prevOffset + LIMIT);
            }
        } catch (err) {
            console.error('Ошибка загрузки дополнительных данных', err);
            setHasMore(false);
            canLoadMore.current = false;
        } finally {
            setLoading(false);
        }
    }, [search, offset, loading, hasMore]);

    // Наблюдатель для скролла
    useEffect(() => {
        if (!loaderRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first.isIntersecting && hasMore && !loading) {
                    loadMoreItems();
                }
            },
            {
                threshold: 0.1,
                rootMargin: '50px'
            }
        );

        const currentLoader = loaderRef.current;
        if (currentLoader) observer.observe(currentLoader);

        return () => {
            if (currentLoader) observer.unobserve(currentLoader);
        };
    }, [loadMoreItems, hasMore, loading]);

    // Обработчик поиска
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const searchValue = e.target.value;
        setSearch(searchValue);
        loadInitialItems();
    };

    // Обработчик DnD
    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const reorderedItems = reorder(items, result.source.index, result.destination.index);
        setItems(reorderedItems);

        try {
            const draggedItemId = parseInt(result.draggableId);

            await saveOrderChange(
                draggedItemId,
                result.source.index,
                result.destination.index,
                Array.from(selectedIds)
            );
        } catch (err) {
            console.error('Ошибка сохранения нового порядка', err);
            await loadInitialItems();
        }
    };

    // Сортировка
    const reorder = (list: Item[], startIndex: number, endIndex: number): Item[] => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
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
            await saveState(Array.from(updated));
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
            </Form.Group>

            {items.length > 0 ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId={`droppable-list-${items.length}`}>
                        {(provided) => (
                            <ul {...provided.droppableProps} ref={provided.innerRef} className="list-unstyled">
                                {items.map((item, index) => (
                                    <Draggable
                                        key={item.id.toString()}
                                        draggableId={item.id.toString()}
                                        index={index}
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
            ) : !loading ? (
                <div className="text-center py-4">Нет элементов</div>
            ) : null}

            {loading && (
                <div className="text-center py-4">Загрузка...</div>
            )}

            {hasMore && (
                <div
                    ref={loaderRef}
                    className="h-10 w-full text-center"
                >
                    {/* Пустой загрузчик для триггера */}
                </div>
            )}
        </div>
    );
};

export default ItemList;