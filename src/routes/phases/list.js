
import _ from 'lodash';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const eClient = util.getElasticSearchClient();

const PHASE_ATTRIBUTES = _.keys(models.ProjectPhase.rawAttributes);

const permissions = tcMiddleware.permissions;


module.exports = [
  permissions('project.view'),
  (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);

    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'startDate';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'startDate asc', 'startDate desc',
      'endDate asc', 'endDate desc',
      'status asc', 'status desc',
    ];
    if (sort && _.indexOf(sortableProps, sort) < 0) {
      return util.handleError('Invalid sort criteria', null, req, next);
    }
    const sortColumnAndOrder = sort.split(' ');

    // Get project from ES
    return eClient.get({ index: ES_PROJECT_INDEX, type: ES_PROJECT_TYPE, id: req.params.projectId })
      .then((doc) => {
        if (!doc) {
          const err = new Error(`active project not found for project id ${projectId}`);
          err.status = 404;
          throw err;
        }

        // Get the phases
        let phases = _.isArray(doc._source.phases) ? doc._source.phases : []; // eslint-disable-line no-underscore-dangle

        // Sort
        phases = _.sortBy(phases, [sortColumnAndOrder[0]], [sortColumnAndOrder[1]]);

        // Parse the fields string to determine what fields are to be returned
        let fields = req.query.fields ? req.query.fields.split(',') : PHASE_ATTRIBUTES;
        fields = _.intersection(fields, PHASE_ATTRIBUTES);
        if (_.indexOf(fields, 'id') < 0) {
          fields.push('id');
        }

        phases = _.map(phases, phase => _.pick(phase, fields));

        res.json(util.wrapResponse(req.id, phases, phases.length));
      })
      .catch(err => next(err));
  },
];
