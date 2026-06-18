export class DbRepository<TModel extends Record<string, any>> {
    constructor(protected readonly model: TModel) {}

    findUnique(args: Parameters<TModel['findUnique']>[0]) {
        return this.model.findUnique(args);
    }

    findMany(args: Parameters<TModel['findMany']>[0]) {
        return this.model.findMany(args);
    }

    create(args: Parameters<TModel['create']>[0]) {
        return this.model.create(args);
    }

    update(args: Parameters<TModel['update']>[0]) {
        return this.model.update(args);
    }

    updateMany(args: Parameters<TModel['updateMany']>[0]) {
        return this.model.updateMany(args);
    }

    delete(args: Parameters<TModel['delete']>[0]) {
        return this.model.delete(args);
    }

    deleteMany(args: Parameters<TModel['deleteMany']>[0]) {
        return this.model.deleteMany(args);
    }
}
