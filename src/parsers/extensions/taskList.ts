import { factorySpace } from 'micromark-factory-space';
import { markdownLineEndingOrSpace, markdownSpace } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';
import { Code, Effects, Extension, State, Token, TokenizeContext } from 'micromark-util-types';
import { CompileContext } from 'mdast-util-from-markdown';

const tasklistCheck = { tokenize: tokenizeTasklistCheck };

export const gfmTaskListItem: Extension = {
  text: { [codes.leftSquareBracket]: tasklistCheck },
};

function tokenizeTasklistCheck(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
  const self = this;

  return open;

  function open(code: Code): State | undefined {
    if (
      // Exit if there’s stuff before.
      self.previous !== codes.eof ||
      // Exit if not in the first content that is the first child of a list
      // item.
      !self._gfmTasklistFirstContentOfListItem
    ) {
      return nok(code);
    }

    effects.enter('taskListCheck' as any);
    effects.enter('taskListCheckMarker' as any);
    effects.consume(code);
    effects.exit('taskListCheckMarker' as any);
    return inside;
  }

  function inside(code: Code): State | undefined {
    if (markdownSpace(code)) {
      effects.enter('taskListCheckValueUnchecked' as any);
      effects.consume(code);
      effects.exit('taskListCheckValueUnchecked' as any);
      return close;
    }

    if (code !== codes.rightSquareBracket) {
      effects.enter('taskListCheckValueChecked' as any);
      effects.consume(code);
      effects.exit('taskListCheckValueChecked' as any);
      return close;
    }

    return nok(code);
  }

  function close(code: Code): State | undefined {
    if (code === codes.rightSquareBracket) {
      effects.enter('taskListCheckMarker' as any);
      effects.consume(code);
      effects.exit('taskListCheckMarker' as any);
      effects.exit('taskListCheck' as any);
      return effects.check({ tokenize: spaceThenNonSpace }, ok, nok);
    }

    return nok(code);
  }
}

function spaceThenNonSpace(this: TokenizeContext, effects: Effects, ok: State, nok: State) {
  const self = this;

  return factorySpace(effects, after, types.whitespace);

  /** @type {State} */
  function after(code: Code) {
    const tail = self.events[self.events.length - 1];

    return tail &&
      tail[1].type === types.whitespace &&
      code !== codes.eof &&
      !markdownLineEndingOrSpace(code)
      ? ok(code)
      : nok(code);
  }
}

/** @type {FromMarkdownExtension} */
export const gfmTaskListItemFromMarkdown = {
  exit: {
    taskListCheckValueChecked: exitCheck,
    taskListCheckValueUnchecked: exitCheck,
    paragraph: exitParagraphWithTaskListItem,
  },
};

function exitCheck(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 2] as any;
  // We’re always in a paragraph, in a list item.
  node.checked = token.type === ('taskListCheckValueChecked' as any);
  node.checkChar = this.sliceSerialize(token);
}

function exitParagraphWithTaskListItem(this: CompileContext, token: Token) {
  const parent = this.stack[this.stack.length - 2] as any;
  const node = this.stack[this.stack.length - 1] as any;
  const siblings = parent.children;
  const head = node.children[0];
  let index = -1;
  /** @type {Paragraph|undefined} */
  let firstParaghraph;

  if (
    parent &&
    parent.type === 'listItem' &&
    typeof parent.checked === 'boolean' &&
    head &&
    head.type === 'text'
  ) {
    while (++index < siblings.length) {
      const sibling = siblings[index];
      if (sibling.type === 'paragraph') {
        firstParaghraph = sibling;
        break;
      }
    }

    if (firstParaghraph === node) {
      // Must start with a space or a tab.
      head.value = head.value.slice(1);

      if (head.value.length === 0) {
        node.children.shift();
      } else if (node.position && head.position && typeof head.position.start.offset === 'number') {
        head.position.start.column++;
        head.position.start.offset++;
        node.position.start = Object.assign({}, head.position.start);
      }
    }
  }

  this.exit(token);
}
