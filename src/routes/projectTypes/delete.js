/**
 * API to delete a project type
 */
import validate from 'express-validation';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    key: Joi.string().max(45).required(),
  },
};

module.exports = [
  validate(schema),
  permissions('projectType.delete'),
  (req, res, next) => {
    const where = {
      deletedAt: { $eq: null },
      key: req.params.key,
    };

    return models.sequelize.transaction(tx =>
      // Update the deletedBy
      models.ProjectType.update({ deletedBy: req.authUser.userId }, {
        where,
        returning: true,
        raw: true,
        transaction: tx,
      })
        .then((updatedResults) => {
          // Not found
          if (updatedResults[0] === 0) {
            const apiErr = new Error(`Project type not found for key ${req.params.key}`);
            apiErr.status = 404;
            return Promise.reject(apiErr);
          }

          // Soft delete
          return models.ProjectType.destroy({
            where,
            transaction: tx,
          });
        })
        .then(() => {
          res.status(204).end();
        })
        .catch(next),
    );
  },
];
