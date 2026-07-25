import update, { Spec } from 'immutability-helper';
import { isPlainObject } from 'src/helpers/util';

import { Nestable, Path } from '../types';
import { SiblingDirection, getSiblingDirection } from './path';

type Mergeable = Record<string, unknown> | unknown[];

function isMergeable(value: unknown): value is Mergeable {
  return isPlainObject(value) || Array.isArray(value);
}

function cloneMergeable<T>(value: T): T {
  return isMergeable(value) ? (mergeSpecs(Array.isArray(value) ? [] : {}, value) as T) : value;
}

// Merges two immutability-helper mutation specs into one, so a remove and an
// insert can be applied to the board in a single `update()` call. Where both
// specs touch the same array (e.g. `$splice`), the operations are
// concatenated rather than one replacing the other.
function mergeSpecs<T extends Mergeable>(target: T, source: T): T {
  if (Array.isArray(source) !== Array.isArray(target)) {
    return cloneMergeable(source);
  }

  if (Array.isArray(source) && Array.isArray(target)) {
    return target.concat(source).map(cloneMergeable) as T;
  }

  const targetObj = target as Record<string, unknown>;
  const sourceObj = source as Record<string, unknown>;
  const destination: Record<string, unknown> = {};

  for (const key of Object.keys(targetObj)) {
    destination[key] = cloneMergeable(targetObj[key]);
  }

  for (const key of Object.keys(sourceObj)) {
    const sourceValue = sourceObj[key];
    if (Object.prototype.hasOwnProperty.call(targetObj, key) && isMergeable(sourceValue)) {
      destination[key] = mergeSpecs(targetObj[key] as Mergeable, sourceValue as Mergeable);
    } else {
      destination[key] = cloneMergeable(sourceValue);
    }
  }

  return destination as T;
}

export function getEntityFromPath(root: Nestable, path: Path): Nestable {
  const step = path.length ? path[0] : null;

  if (step !== null && root.children && root.children[step]) {
    return getEntityFromPath(root.children[step], path.slice(1));
  }

  return root;
}

export function buildUpdateMutation(path: Path, mutation: Spec<Nestable>) {
  let pathedMutation: Spec<Nestable> = mutation;

  for (let i = path.length - 1; i >= 0; i--) {
    pathedMutation = {
      children: {
        [path[i]]: pathedMutation,
      },
    };
  }

  return pathedMutation;
}

export function buildUpdateParentMutation(path: Path, mutation: Spec<Nestable>) {
  let pathedMutation: Spec<Nestable> = mutation;

  for (let i = path.length - 2; i >= 0; i--) {
    pathedMutation = {
      children: {
        [path[i]]: pathedMutation,
      },
    };
  }

  return pathedMutation;
}

export function buildRemoveMutation(path: Path, replacement?: Nestable) {
  const val: Spec<any, any> = replacement ? [path.last(), 1, replacement] : [path.last(), 1];
  return buildUpdateParentMutation(path, {
    children: {
      $splice: [val],
    },
  });
}

export function buildInsertMutation(
  destination: Path,
  entities: Nestable[],
  destinationModifier: number = 0
) {
  return buildUpdateParentMutation(destination, {
    children: {
      $splice: [[destination.last()! + destinationModifier, 0, ...entities]],
    },
  });
}

export function buildAppendMutation(destination: Path, entities: Nestable[]) {
  return buildUpdateParentMutation(destination, {
    children: {
      $push: entities,
    },
  });
}

export function buildPrependMutation(destination: Path, entities: Nestable[]) {
  return buildUpdateParentMutation(destination, {
    children: {
      $unshift: entities,
    },
  });
}

export function moveEntity(
  root: Nestable,
  source: Path,
  destination: Path,
  transform?: (entity: Nestable) => Nestable | Nestable[],
  replace?: (entity: Nestable) => Nestable | undefined
) {
  const entity = transform
    ? transform(getEntityFromPath(root, source))
    : getEntityFromPath(root, source);
  const siblingDirection = getSiblingDirection(source, destination);

  const destinationModifier = siblingDirection === SiblingDirection.After ? -1 : 0;

  const replacement = replace?.(getEntityFromPath(root, source));
  const removeMutation = buildRemoveMutation(source, replacement);
  const insertMutation = buildInsertMutation(
    destination,
    Array.isArray(entity) ? entity : [entity],
    destinationModifier
  );

  const mutation = mergeSpecs(
    removeMutation as Mergeable,
    insertMutation as Mergeable
  ) as Spec<Nestable>;

  const newBoard = update(root, mutation);

  return newBoard;
}

export function removeEntity(root: Nestable, target: Path, replacement?: Nestable) {
  return update(root, buildRemoveMutation(target, replacement));
}

export function insertEntity(root: Nestable, destination: Path, entities: Nestable[]) {
  return update(root, buildInsertMutation(destination, entities));
}

export function appendEntities(root: Nestable, destination: Path, entities: Nestable[]) {
  return update(root, buildAppendMutation(destination, entities));
}

export function prependEntities(root: Nestable, destination: Path, entities: Nestable[]) {
  return update(root, buildPrependMutation(destination, entities));
}

export function updateEntity(root: Nestable, path: Path, mutation: Spec<Nestable>) {
  return update(root, buildUpdateMutation(path, mutation));
}

export function updateParentEntity(root: Nestable, path: Path, mutation: Spec<Nestable>) {
  return update(root, buildUpdateParentMutation(path, mutation));
}
