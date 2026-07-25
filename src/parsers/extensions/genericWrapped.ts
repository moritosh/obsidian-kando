import { CompileContext, Extension as FromMarkdownExtension, Token } from 'mdast-util-from-markdown';
import { markdownLineEnding, markdownLineEndingOrSpace } from 'micromark-util-character';
import { Code, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { getSelf } from './helpers';

export function genericWrappedExtension(
  name: string,
  startMarker: string,
  endMarker: string
): Extension {
  function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
    let data = false;
    let startMarkerCursor = 0;
    let endMarkerCursor = 0;

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
      if (markdownLineEnding(code) || code === null) {
        return nok(code);
      }

      effects.enter(`${name}Data` as any);
      effects.enter(`${name}Target` as any);
      return consumeTarget(code);
    }

    function consumeTarget(code: Code): State | undefined {
      if (code === endMarker.charCodeAt(endMarkerCursor)) {
        if (!data) return nok(code);
        effects.exit(`${name}Target` as any);
        effects.exit(`${name}Data` as any);
        effects.enter(`${name}Marker` as any);
        return consumeEnd(code);
      }

      if (markdownLineEnding(code) || code === null) {
        return nok(code);
      }

      if (!markdownLineEndingOrSpace(code)) {
        data = true;
      }

      effects.consume(code);

      return consumeTarget;
    }

    function consumeEnd(code: Code): State | undefined {
      if (endMarkerCursor === endMarker.length) {
        effects.exit(`${name}Marker` as any);
        effects.exit(name as any);
        return ok(code);
      }

      if (code !== endMarker.charCodeAt(endMarkerCursor)) {
        return nok(code);
      }

      effects.consume(code);
      endMarkerCursor++;

      return consumeEnd;
    }
  }

  const call = { tokenize: tokenize };

  return {
    text: { [startMarker.charCodeAt(0)]: call },
  };
}

export function genericWrappedFromMarkdown(
  name: string,
  process?: (str: string, curr: Record<string, any>) => void
): FromMarkdownExtension {
  function enterWrapped(this: CompileContext, token: Token) {
    this.enter(
      {
        type: name,
        value: null,
      } as any,
      token
    );
  }

  function exitWrappedTarget(this: CompileContext, token: Token) {
    const target = this.sliceSerialize(token);
    const current = getSelf(this.stack);

    (current as any).value = target;

    if (process) {
      process(target, current as any);
    }
  }

  function exitWrapped(this: CompileContext, token: Token) {
    this.exit(token);
  }

  return {
    enter: {
      [name]: enterWrapped,
    },
    exit: {
      [`${name}Target`]: exitWrappedTarget,
      [name]: exitWrapped,
    },
  };
}
