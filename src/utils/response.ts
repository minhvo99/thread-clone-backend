type ResponseBody<TData> = {
    status: number;
    message: string;
    data?: TData;
};

export function toResponseBody<TData>({
    status,
    message,
    data,
}: ResponseBody<TData>): ResponseBody<TData> {
    return data === undefined ? { status, message } : { status, message, data };
}
