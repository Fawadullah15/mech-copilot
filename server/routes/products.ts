import { Router } from 'express';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  createProductRevisionSchema,
} from '../schemas/manufacturingSchemas.js';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  archiveProduct,
  deleteProduct,
  createProductRevision,
  getProductRevisions,
  getProductRevisionById,
  releaseProductRevision,
  obsoleteProductRevision,
  ProductError,
} from '../services/productService.js';

export const productsRouter = Router();

// GET /api/products - List products with optional search and filters
productsRouter.get('/', (req, res, next) => {
  try {
    const query = productQuerySchema.parse(req.query);
    const products = getProducts(query);
    res.json({ count: products.length, products });
  } catch (err) {
    next(err);
  }
});

// POST /api/products - Create a new product master record
productsRouter.post('/', (req, res, next) => {
  try {
    const body = createProductSchema.parse(req.body);
    const product = createProduct(body);
    res.status(201).json(product);
  } catch (err: any) {
    if (err instanceof ProductError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/products/:id - Retrieve product by ID with revision history
productsRouter.get('/:id', (req, res, next) => {
  try {
    const product = getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: `Product not found: ${req.params.id}` });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/products/:id - Update product master metadata
productsRouter.patch('/:id', (req, res, next) => {
  try {
    const body = updateProductSchema.parse(req.body);
    const updated = updateProduct(req.params.id, body);
    res.json(updated);
  } catch (err: any) {
    if (err instanceof ProductError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/products/:id/archive - Soft archive a product
productsRouter.post('/:id/archive', (req, res, next) => {
  try {
    const archived = archiveProduct(req.params.id);
    res.json(archived);
  } catch (err: any) {
    if (err instanceof ProductError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/products/:id - Delete product if not referenced
productsRouter.delete('/:id', (req, res, next) => {
  try {
    deleteProduct(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    if (err instanceof ProductError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/products/:id/revisions - List all revisions of a product
productsRouter.get('/:id/revisions', (req, res, next) => {
  try {
    const revisions = getProductRevisions(req.params.id);
    res.json({ count: revisions.length, revisions });
  } catch (err: any) {
    if (err instanceof ProductError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/products/:id/revisions - Create new draft revision
productsRouter.post('/:id/revisions', (req, res, next) => {
  try {
    const body = createProductRevisionSchema.parse(req.body);
    const revision = createProductRevision(req.params.id, body);
    res.status(201).json(revision);
  } catch (err: any) {
    if (err instanceof ProductError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/products/:id/revisions/:revId - Retrieve specific revision
productsRouter.get('/:id/revisions/:revId', (req, res, next) => {
  try {
    const revision = getProductRevisionById(req.params.id, req.params.revId);
    if (!revision) {
      return res.status(404).json({ error: `Revision '${req.params.revId}' not found for product '${req.params.id}'` });
    }
    res.json(revision);
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:id/revisions/:revId/release - Release revision
productsRouter.post('/:id/revisions/:revId/release', (req, res, next) => {
  try {
    const released = releaseProductRevision(req.params.id, req.params.revId, req.body?.effective_date);
    res.json(released);
  } catch (err: any) {
    if (err instanceof ProductError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/products/:id/revisions/:revId/obsolete - Obsolete revision
productsRouter.post('/:id/revisions/:revId/obsolete', (req, res, next) => {
  try {
    const obsoleted = obsoleteProductRevision(req.params.id, req.params.revId);
    res.json(obsoleted);
  } catch (err: any) {
    if (err instanceof ProductError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});
