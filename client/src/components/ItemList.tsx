import React, { useEffect, useState, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Form } from 'react-bootstrap';
import { fetchItems, saveState, loadState } from '../api/api';
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
    const [customOrder, setCustomOrder] = useState<number[]>([]);

    // Загрузка состояния с сервера
    useEffect(() => {
        const restoreState = async () => {
            const state = await loadState();
            setSelectedIds(new Set(state.selectedIds || []));
            setCustomOrder(state.customOrder || []);
        };
        restoreState();
    }, []);

    // Загрузка следующей порции элементов
    const loadMore = useCallback(async () => {
        setLoading(true);
        try {
            const newItems = await fetchItems(search, offset, LIMIT, customOrder);
            setItems(prev => [...prev, ...newItems]);
            setOffset(prev => prev + LIMIT);
            if (newItems.length < LIMIT) {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Ошибка загрузки данных', err);
        } finally {
            setLoading(false);
        }
    }, [search, offset, customOrder]);

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
    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const reorderedItems = reorder(items, result.source.index, result.destination.index);
        setItems(reorderedItems);

        const newOrder = reorderedItems.map(i => i.id);
        saveState(Array.from(selectedIds), newOrder);
        setCustomOrder(newOrder);
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
    const toggleSelect = (id: number) => {
        const updated = new Set(selectedIds);
        if (updated.has(id)) {
            updated.delete(id);
        } else {
            updated.add(id);
        }
        setSelectedIds(updated);
        saveState(Array.from(updated), items.map(i => i.id));
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
            ) : (
                <div className="text-center py-4">Загрузка...</div>
            )}
            <div ref={loaderRef} />
        </div>
    );
};

export default ItemList;
