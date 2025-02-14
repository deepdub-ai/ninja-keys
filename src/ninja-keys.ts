import {LitElement, html, TemplateResult} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {repeat} from 'lit/directives/repeat.js';
import {live} from 'lit/directives/live.js';
import {createRef, ref} from 'lit-html/directives/ref.js';
import {classMap} from 'lit/directives/class-map.js';
import hotkeys from 'hotkeys-js';

import './ninja-header.js';
import './ninja-action.js';
import {INinjaAction} from './interfaces/ininja-action.js';
import {NinjaHeader} from './ninja-header.js';
import {NinjaAction} from './ninja-action.js';
import {footerHtml} from './ninja-footer.js';
import {baseStyles} from './base-styles.js';
import {commandScore} from './command-score';

@customElement('ninja-keys')
export class NinjaKeys extends LitElement {
  static override styles = [baseStyles];

  _ignorePrefixesSplit: string[] | null = null;

  /**
   * Search placeholder text
   */
  @property({type: String}) placeholder = 'Type a command or search...';

  /**
   * If true will register all hotkey for all actions
   */
  @property({type: Boolean}) disableHotkeys = false;

  /**
   * Show or hide breadcrumbs on header
   */
  @property({type: Boolean}) hideBreadcrumbs = false;

  /**
   * Show or hide breadcrumbs on header
   */
  @property({type: String}) ignorePrefixes = '';

  /**
   * Open or hide shorcut
   */
  @property() openHotkey = 'cmd+k,ctrl+k';

  /**
   * Navigation Up hotkey
   */
  @property() navigationUpHotkey = 'up,shift+tab';

  /**
   * Navigation Down hotkey
   */
  @property() navigationDownHotkey = 'down,tab';

  /**
   * Close hotkey
   */
  @property() closeHotkey = 'esc';

  /**
   * Go back on one level if has parent menu
   */
  @property() goBackHotkey = 'backspace';

  /**
   * Select action and execute handler or open submenu
   */
  @property() selectHotkey = 'enter'; // enter,space

  /**
   * Show or hide breadcrumbs on header
   */
  @property({type: Boolean}) hotKeysJoinedView = false;

  /**
   * Disable load material icons font on connect
   * If you use custom icons.
   * Set this attribute to prevent load default icons font
   */
  @property({type: Boolean}) noAutoLoadMdIcons = false;

  @property({type: Number}) numRecentActions = 0;

  /**
   * Array of actions
   */
  @property({
    type: Array,
    hasChanged() {
      // Forced to trigger changed event always.
      // Because of a lot of framework pattern wrap object with an Observer, like vue2.
      // That's why object passed to web component always same and no render triggered. Issue #9
      return true;
    },
  })
  data = [] as Array<INinjaAction>;

  /**
   * Public methods
   */

  /**
   * Show a modal
   */
  open(options: {parent?: string; search?: string} = {}) {
    this._bump = true;
    this.visible = true;
    this._headerRef.value!.focusSearch();
    if (this._actionMatches.length > 0) {
      this._selected = this._actionMatches[0];
    }
    this.setParent(options.parent);
    this._headerRef.value?.setSearch(options.search ?? '');
    this._search = options.search ?? '';
    setTimeout(() => {
      this._wrapperRef.value?.querySelector<HTMLDivElement>('.actions-list')?.scrollTo({top: 0});
    }, 0);
  }

  /**
   * Close modal
   */
  close() {
    this._bump = false;
    this.visible = false;
  }

  /**
   * Navigate to group of actions
   * @param parent id of parent group/action
   */
  setParent(parent?: string) {
    if (!parent) {
      this._currentRoot = undefined;
      // this.breadcrumbs = [];
    } else {
      this._currentRoot = parent;
    }
    this._selected = undefined;
    this._search = '';
    this._headerRef.value!.setSearch('');
  }

  /**
   * Show or hide element
   */
  @state() visible = false;
  /**
   * Temproray used for animation effect. TODO: change to animate logic
   */
  @state()
  private _bump = true;

  @state()
  private _actionMatches = [] as Array<INinjaAction>;

  @state()
  private _search = '';

  @state()
  private _currentRoot?: string;

  @state()
  private get breadcrumbs() {
    const path: string[] = [];
    let parentAction = this._selected?.parent;
    if (parentAction) {
      path.push(parentAction);
      while (parentAction) {
        // const action = this._flatData.find((a) => a.id === parentAction);
        const action = ([] as INinjaAction[]).find((a) => a.id === parentAction);
        if (action?.parent) {
          path.push(action.parent);
        }
        parentAction = action ? action.parent : undefined;
      }
    }
    return path.reverse();
  }

  @state()
  private _selected?: INinjaAction;

  override connectedCallback() {
    super.connectedCallback();

    if (!this.noAutoLoadMdIcons) {
      document.fonts.load('24px Material Icons', 'apps').then(() => {});
    }

    this._registerInternalHotkeys();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._unregisterInternalHotkeys();
  }

  private _registerInternalHotkeys() {
    if (this.openHotkey) {
      hotkeys(this.openHotkey, (event) => {
        event.preventDefault();
        this.visible ? this.close() : this.open();
      });
    }

    if (this.selectHotkey) {
      hotkeys(this.selectHotkey, (event) => {
        if (!this.visible) {
          return;
        }
        event.preventDefault();
        this._actionSelected(this._actionMatches[this._selectedIndex]);
      });
    }

    if (this.goBackHotkey) {
      hotkeys(this.goBackHotkey, (event) => {
        if (!this.visible) {
          return;
        }
        if (!this._search) {
          event.preventDefault();
          this._goBack();
        }
      });
    }

    if (this.navigationDownHotkey) {
      hotkeys(this.navigationDownHotkey, (event) => {
        if (!this.visible) {
          return;
        }
        event.preventDefault();
        if (this._selectedIndex >= this._actionMatches.length - 1) {
          this._selected = this._actionMatches[0];
        } else {
          this._selected = this._actionMatches[this._selectedIndex + 1];
        }
      });
    }

    if (this.navigationUpHotkey) {
      hotkeys(this.navigationUpHotkey, (event) => {
        if (!this.visible) {
          return;
        }
        event.preventDefault();
        if (this._selectedIndex === 0) {
          this._selected = this._actionMatches[this._actionMatches.length - 1];
        } else {
          this._selected = this._actionMatches[this._selectedIndex - 1];
        }
      });
    }

    if (this.closeHotkey) {
      hotkeys(this.closeHotkey, () => {
        if (!this.visible) {
          return;
        }
        this.close();
      });
    }
  }

  private _unregisterInternalHotkeys() {
    if (this.openHotkey) {
      hotkeys.unbind(this.openHotkey);
    }

    if (this.selectHotkey) {
      hotkeys.unbind(this.selectHotkey);
    }

    if (this.goBackHotkey) {
      hotkeys.unbind(this.goBackHotkey);
    }

    if (this.navigationDownHotkey) {
      hotkeys.unbind(this.navigationDownHotkey);
    }

    if (this.navigationUpHotkey) {
      hotkeys.unbind(this.navigationUpHotkey);
    }

    if (this.closeHotkey) {
      hotkeys.unbind(this.closeHotkey);
    }
  }

  private _actionFocused(index: INinjaAction, $event: MouseEvent) {
    // this.selectedIndex = index;
    this._selected = index;
    ($event.target as NinjaAction).ensureInView();
  }

  private _onTransitionEnd() {
    this._bump = false;
  }

  private _goBack() {
    const parent = this.breadcrumbs.length > 1 ? this.breadcrumbs[this.breadcrumbs.length - 2] : undefined;
    this.setParent(parent);
  }

  private _headerRef = createRef<NinjaHeader>();
  private _wrapperRef = createRef<HTMLDivElement>();

  override render() {
    const classes = {
      bump: this._bump,
      'modal-content': true,
    };

    const menuClasses = {
      visible: this.visible,
      modal: true,
      isLoadingItems: false,
    };

    let searchNoPrefix = this._search;

    this._ignorePrefixesSplit ??= this.ignorePrefixes !== '' ? this.ignorePrefixes.split(',') : [];

    this._ignorePrefixesSplit?.some((prefix: string) => {
      if (searchNoPrefix.startsWith(prefix)) {
        searchNoPrefix = searchNoPrefix.substring(prefix.length);
        return true;
      }

      return false;
    });
    searchNoPrefix = searchNoPrefix.trim();

    const matchInidices: {[label: string]: number[]} = {};
    const results: {score: number; item: INinjaAction}[] = [];
    const items = this._currentRoot
      ? this.data.find((item) => item.id === this._currentRoot)?.children ?? []
      : this.data;

    items.forEach((item, index) => {
      if (item === 'loading') {
        menuClasses.isLoadingItems = true;
        return;
      }

      if (typeof item === 'function') {
        const parent = this.data.find((item) => item.id === this._currentRoot)!;
        parent.children?.splice(index, 1, 'loading');

        menuClasses.isLoadingItems = true;

        item().then((result: INinjaAction[]) => {
          parent.children?.splice(index, 1, ...result);
          this.render();
        });
        return;
      }

      const result = commandScore(item.title, searchNoPrefix);

      // global search for items on root
      //
      if ((this._currentRoot || !searchNoPrefix) && item.parent !== this._currentRoot) {
        return;
      }

      matchInidices[item.title] = result.indices;
      if (result.score > 0) {
        results.push({score: result.score, item: item});
      }
    });

    const actionMatches = (
      searchNoPrefix
        ? results.sort((a, b) => {
            if (a.score === b.score) {
              return a.item.title.localeCompare(b.item.title);
            }
            return b.score - a.score;
          })
        : results
    ).map((suggestion) => suggestion.item);

    const sections = actionMatches.reduce(
      (entryMap, e) => entryMap.set(e.section, [...(entryMap.get(e.section) || []), e]),
      new Map()
    );

    this._actionMatches = [...sections.values()].flat();

    if (this._actionMatches.length > 0 && this._selectedIndex === -1) {
      this._selected = this._actionMatches[0];
    }
    if (this._actionMatches.length === 0) {
      this._selected = undefined;
    }

    const isShowTitle = !this._currentRoot && this.numRecentActions !== 0 && !searchNoPrefix;

    const actionsList = (actions: INinjaAction[]) =>
      html` ${repeat(
        actions,
        (action) => action.id,
        (action, index) => {
          const title = !isShowTitle
            ? ''
            : index === 0
            ? html`<div class="title">Recently Used</div>`
            : this.numRecentActions === index
            ? html`<div class="title separator">Other Commands</div>`
            : '';

          return html`${title}<ninja-action
              exportparts="ninja-action,ninja-selected,ninja-icon"
              .selected=${live(action.id === this._selected?.id)}
              .hotKeysJoinedView=${this.hotKeysJoinedView}
              @mousemove=${(event: MouseEvent) => this._actionFocused(action, event)}
              @actionsSelected=${(event: CustomEvent<INinjaAction>) => this._actionSelected(event.detail)}
              .action=${action}
              .matchIndices=${matchInidices[action.title]}
            ></ninja-action>`;
        }
      )}`;

    const itemTemplates: TemplateResult[] = [];
    sections.forEach((actions, section) => {
      const header = section ? html`<div class="group-header">${section}</div>` : undefined;
      itemTemplates.push(html`${header}${actionsList(actions)}`);
    });

    return html`
      <div @click=${this._overlayClick} class=${classMap(menuClasses)} ${ref(this._wrapperRef)}>
        <div class=${classMap(classes)} @animationend=${this._onTransitionEnd}>
          <ninja-header
            exportparts="ninja-input,ninja-input-wrapper"
            ${ref(this._headerRef)}
            .placeholder=${this.placeholder}
            .hideBreadcrumbs=${this.hideBreadcrumbs}
            .breadcrumbs=${this.breadcrumbs}
            @change=${this._handleInput}
            @setParent=${(event: CustomEvent<INinjaAction>) => this.setParent(event.detail.parent)}
            @close=${this.close}
          >
          </ninja-header>
          <div class="modal-body">
            <div class="loading-indicator">
              <span class="bar1"></span>
              <span class="bar2"></span>
            </div>
            <div class="actions-list" part="actions-list">${itemTemplates}</div>
          </div>
          <slot name="footer"> ${footerHtml} </slot>
        </div>
      </div>
    `;
  }

  private get _selectedIndex(): number {
    if (!this._selected) {
      return -1;
    }
    return this._actionMatches.indexOf(this._selected);
  }

  private _actionSelected(action?: INinjaAction) {
    // fire selected event even when action is empty/not selected,
    // so possible handle api search for example
    this.dispatchEvent(
      new CustomEvent('selected', {
        detail: {search: this._search, action},
        bubbles: true,
        composed: true,
      })
    );

    if (!action) {
      return;
    }

    if (action.children && action.children?.length > 0) {
      this._currentRoot = action.id;
      this._search = '';
    }

    this._headerRef.value!.setSearch('');
    this._headerRef.value!.focusSearch();

    if (action.handler) {
      const result = action.handler(action);
      if (!result?.keepOpen) {
        this.close();
      }
    }

    this._bump = true;
  }

  private async _handleInput(event: CustomEvent<{search: string}>) {
    this._search = event.detail.search;
    await this.updateComplete;
    // Focus on the first item on input change
    //
    this._selected = this._actionMatches[0];
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: {search: this._search, actions: this._actionMatches},
        bubbles: true,
        composed: true,
      })
    );
  }

  private _overlayClick(event: Event) {
    if ((event.target as HTMLElement)?.classList.contains('modal')) {
      this.close();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ninja-keys': NinjaKeys;
  }
}
