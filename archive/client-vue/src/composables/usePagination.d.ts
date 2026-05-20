export declare function usePagination<T>(fetchFn: (page: number) => Promise<{
    total: number;
    page: number;
    totalPages: number;
    items?: T[];
}>): {
    items: Ref<T[]>;
    loading: any;
    error: any;
    hasMore: any;
    loadMore: (reset?: boolean) => Promise<void>;
    total: any;
};
//# sourceMappingURL=usePagination.d.ts.map