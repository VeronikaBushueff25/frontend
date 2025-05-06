export interface Item {
    id: number;
    value: string;
}

export interface ServerState {
    selectedIds: number[];
    itemOrder: number[];
}