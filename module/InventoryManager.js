import { log } from "../paranormal-sheets.js";

/**
 * A helper class to manage actor inventory actions.
 */
export class InventoryManager {

    /**
     * Handles the creation of a new item of a specific type.
     * @param {Actor} actor The actor to whom the item will be added.
     * @param {HTMLElement} target The element that triggered the action (the create button).
     */
    static async createItem(actor, target) {
        const itemType = target.dataset.type;
        if (!itemType) return;

        const itemData = {
            name: `Novo Item (${itemType})`,
            type: itemType
        };

        await Item.create(itemData, { parent: actor });
    }

    /**
     * Handles viewing/editing an existing item.
     * @param {Actor} actor The actor who owns the item.
     * @param {HTMLElement} target The element that triggered the action (the edit icon).
     */
    static viewItem(actor, target) {
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        if (!itemId) return;

        const item = actor.items.get(itemId);
        if (item) {
            item.sheet.render(true);
        }
    }

    /**
     * Handles the deletion of an item.
     * @param {Actor} actor The actor who owns the item.
     * @param {HTMLElement} target The element that triggered the action (the delete icon).
     */
    static async deleteItem(actor, target) {
        log("chegou 1");
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        log("itemId: " + itemId);
        if (!itemId) return;

        await actor.deleteEmbeddedDocuments("Item", [itemId]);
    }

    /**
     * Sends an item's description to the chat.
     * @param {Actor} actor The actor who owns the item.
     * @param {HTMLElement} target The element that triggered the action.
     */
    static async sendItemToChat(actor, target) {
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        if (!itemId) return;

        const item = actor.items.get(itemId);
        if (!item) return;

        let content = `
            <div class="paranormal-sheets-chat-card item-card">
                <header class="card-header">
                    <img src="${item.img}" title="${item.name}" width="36" height="36"/>
                    <h3>${item.name}</h3>
                </header>
                <div class="card-content">
                    ${item.system.description ?? ""}
                </div>
            </div>
        `;

        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: content
        });
    }
}