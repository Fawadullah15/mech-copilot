import { Router } from 'express';
import {
  createBOMSchema,
  updateBOMSchema,
  bomQuerySchema,
  addBOMLineSchema,
  updateBOMLineSchema,
  explodeBOMQuerySchema,
} from '../schemas/manufacturingSchemas.js';
import {
  createBOM,
  getBOMs,
  getBOMById,
  updateBOM,
  deleteBOM,
  addBOMLine,
  updateBOMLine,
  deleteBOMLine,
  validateBOM,
  releaseBOM,
  obsoleteBOM,
  BOMError,
} from '../services/bomService.js';
import {
  explodeBOM,
  BOMCalculationError,
} from '../services/bomCalculationService.js';

export const bomsRouter = Router();

// GET /api/boms - Query BOM headers
bomsRouter.get('/', (req, res, next) => {
  try {
    const query = bomQuerySchema.parse(req.query);
    const boms = getBOMs(query);
    res.json({ count: boms.length, boms });
  } catch (err) {
    next(err);
  }
});

// POST /api/boms - Create a new BOM header
bomsRouter.post('/', (req, res, next) => {
  try {
    const body = createBOMSchema.parse(req.body);
    const bom = createBOM(body);
    res.status(201).json(bom);
  } catch (err: any) {
    if (err instanceof BOMError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/boms/:id - Retrieve BOM by ID with line items
bomsRouter.get('/:id', (req, res, next) => {
  try {
    const bom = getBOMById(req.params.id);
    if (!bom) {
      return res.status(404).json({ error: `BOM not found: ${req.params.id}` });
    }
    res.json(bom);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/boms/:id - Update draft BOM header
bomsRouter.patch('/:id', (req, res, next) => {
  try {
    const body = updateBOMSchema.parse(req.body);
    const updated = updateBOM(req.params.id, body);
    res.json(updated);
  } catch (err: any) {
    if (err instanceof BOMError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/boms/:id - Delete draft BOM
bomsRouter.delete('/:id', (req, res, next) => {
  try {
    deleteBOM(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    if (err instanceof BOMError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/boms/:id/lines - Retrieve lines for a BOM
bomsRouter.get('/:id/lines', (req, res, next) => {
  try {
    const bom = getBOMById(req.params.id);
    if (!bom) {
      return res.status(404).json({ error: `BOM not found: ${req.params.id}` });
    }
    res.json({ count: bom.lines.length, lines: bom.lines });
  } catch (err) {
    next(err);
  }
});

// POST /api/boms/:id/lines - Add line item to draft BOM
bomsRouter.post('/:id/lines', (req, res, next) => {
  try {
    const body = addBOMLineSchema.parse(req.body);
    const line = addBOMLine(req.params.id, body);
    res.status(201).json(line);
  } catch (err: any) {
    if (err instanceof BOMError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// PATCH /api/boms/:id/lines/:lineId - Update line item on draft BOM
bomsRouter.patch('/:id/lines/:lineId', (req, res, next) => {
  try {
    const body = updateBOMLineSchema.parse(req.body);
    const updated = updateBOMLine(req.params.id, req.params.lineId, body);
    res.json(updated);
  } catch (err: any) {
    if (err instanceof BOMError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/boms/:id/lines/:lineId - Delete line item from draft BOM
bomsRouter.delete('/:id/lines/:lineId', (req, res, next) => {
  try {
    deleteBOMLine(req.params.id, req.params.lineId);
    res.status(204).send();
  } catch (err: any) {
    if (err instanceof BOMError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/boms/:id/validate - Run validation check on BOM
bomsRouter.post('/:id/validate', (req, res, next) => {
  try {
    const validation = validateBOM(req.params.id);
    res.json(validation);
  } catch (err: any) {
    if (err instanceof BOMError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/boms/:id/release - Validate and release BOM
bomsRouter.post('/:id/release', (req, res, next) => {
  try {
    const released = releaseBOM(req.params.id);
    res.json(released);
  } catch (err: any) {
    if (err instanceof BOMError) {
      return res.status(err.statusCode).json({ error: err.message, errors: (err as any).errors });
    }
    next(err);
  }
});

// POST /api/boms/:id/obsolete - Mark BOM as obsolete
bomsRouter.post('/:id/obsolete', (req, res, next) => {
  try {
    const obsoleted = obsoleteBOM(req.params.id);
    res.json(obsoleted);
  } catch (err: any) {
    if (err instanceof BOMError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/boms/:id/explode - Deterministic multi-level recursive BOM explosion
bomsRouter.get('/:id/explode', (req, res, next) => {
  try {
    const query = explodeBOMQuerySchema.parse(req.query);
    const exploded = explodeBOM(req.params.id, query.quantity);
    res.json(exploded);
  } catch (err: any) {
    if (err instanceof BOMCalculationError || err instanceof BOMError) {
      return res.status(err.statusCode).json({
        error: err.message,
        cycle_path: (err as any).cyclePath,
      });
    }
    next(err);
  }
});
