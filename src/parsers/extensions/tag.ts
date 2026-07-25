import { CompileContext, Extension as FromMarkdownExtension, Token } from 'mdast-util-from-markdown';
import { markdownLineEndingOrSpace } from 'micromark-util-character';
import { Code, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { getSelf } from './helpers';

export function tagExtension(): Extension {
  const name = 'hashtag';
  const hashCharCode = '#'.charCodeAt(0);

  function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
    let data = false;
    let startMarkerCursor = 0;
    const self = this;

    return start;

    function start(code: Code): State | undefined {
      if (
        code !== hashCharCode ||
        (self.previous !== null && !/\s/.test(String.fromCharCode(self.previous)))
      ) {
        return nok(code);
      }

      effects.enter(name as any);
      effects.enter(`${name}Marker` as any);

      return consumeStart(code);
    }

    function consumeStart(code: Code): State | undefined {
      if (startMarkerCursor === 1) {
        effects.exit(`${name}Marker` as any);
        return consumeData(code);
      }

      if (code !== hashCharCode) {
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
      if (
        code === null ||
        markdownLineEndingOrSpace(code) ||
        /[\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~[\]\\\s\n\r]/.test(
          String.fromCharCode(code)
        )
      ) {
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
    text: { [hashCharCode]: call },
  };
}

export function tagFromMarkdown(): FromMarkdownExtension {
  const name = 'hashtag';

  function enterTag(this: CompileContext, token: Token) {
    this.enter(
      {
        type: name,
        value: null,
      } as any,
      token
    );
  }

  function exitTagTarget(this: CompileContext, token: Token) {
    const target = this.sliceSerialize(token);
    const current = getSelf(this.stack);

    (current as any).value = target;
  }

  function exitTag(this: CompileContext, token: Token) {
    this.exit(token);
  }

  return {
    enter: {
      [name]: enterTag,
    },
    exit: {
      [`${name}Target`]: exitTagTarget,
      [name]: exitTag,
    },
  };
}
