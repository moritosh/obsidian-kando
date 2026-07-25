import { CompileContext, Extension as FromMarkdownExtension, Token } from 'mdast-util-from-markdown';
import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { Code, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { getSelf } from './helpers';

export function blockidExtension(): Extension {
  const name = 'blockid';
  const startMarker = '^';

  function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
    let data = false;
    let startMarkerCursor = 0;

    return start;

    function start(code: Code): State | undefined {
      if (code !== startMarker.charCodeAt(startMarkerCursor)) return nok(code);

      effects.enter(name as any);
      effects.enter(`${name}Marker` as any);

      return consumeStart(code);
    }

    function consumeStart(code: Code): State | undefined {
      if (startMarkerCursor === startMarker.length) {
        effects.exit(`${name}Marker` as any);
        return consumeData(code);
      }

      if (code !== startMarker.charCodeAt(startMarkerCursor)) {
        return nok(code);
      }

      effects.consume(code);
      startMarkerCursor++;

      return consumeStart;
    }

    function consumeData(code: Code): State | undefined {
      effects.enter(`${name}Data` as any);
      effects.enter(`${name}Target` as any);
      return consumeTarget(code);
    }

    function consumeTarget(code: Code): State | undefined {
      if (markdownSpace(code)) {
        return nok(code);
      }

      if (markdownLineEnding(code) || code === null) {
        if (!data) return nok(code);
        effects.exit(`${name}Target` as any);
        effects.exit(`${name}Data` as any);
        effects.exit(name as any);

        return ok(code);
      }

      data = true;
      effects.consume(code);

      return consumeTarget;
    }
  }

  const call = { tokenize: tokenize };

  return {
    text: { [startMarker.charCodeAt(0)]: call },
  };
}

export function blockidFromMarkdown(): FromMarkdownExtension {
  const name = 'blockid';

  function enter(this: CompileContext, token: Token) {
    this.enter(
      {
        type: name,
        value: null,
      } as any,
      token
    );
  }

  function exitTarget(this: CompileContext, token: Token) {
    const target = this.sliceSerialize(token);
    const current = getSelf(this.stack);

    (current as any).value = target;
  }

  function exit(this: CompileContext, token: Token) {
    this.exit(token);
  }

  return {
    enter: {
      [name]: enter,
    },
    exit: {
      [`${name}Target`]: exitTarget,
      [name]: exit,
    },
  };
}
