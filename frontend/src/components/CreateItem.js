import React from "react";
import Button from "./Button";
import { Input as RSGInput } from "rsg-components";
import { Link } from "react-router-dom";
import "../styles/CreateItem.css";
import ItemCreated from "./ItemCreated";

/* global chrome */
const backgroundPage = chrome.extension.getBackgroundPage();

class CreateItem extends React.Component {
  state = {
    name: "",
    description: "",
    boardId: this.props.match.params.boardId,
    // id - the id of a column if creating a new card,
    // or the id of a card if posting a comment.
    id: this.props.match.params.id,
    files: [],
    isCard: this.props.match.params.role === "new",
    warning: null,
    itemCreated: false
  };

  componentDidMount = () => {
    document.querySelector("body").addEventListener("drop", this.dropHandler);
    document
      .querySelector("body")
      .addEventListener("dragover", this.dragOverHandler);

    if (backgroundPage.timerInComment) {
      this.insertText(backgroundPage.timestamp);
      backgroundPage.timerInComment = false;
    }
  };

  publish = ev => {
    ev.preventDefault();
    const { isCard, name, description } = this.state;

    // Clear any past warnings
    this.setState({ warning: null });

    if (isCard && (!name || !name.trim())) {
      this.setState({ warning: "No name provided!" });
      return;
    }

    if (!isCard && (!description || !description.trim())) {
      this.setState({ warning: "Missing comment!" });
      return;
    }

    backgroundPage.publishItem(this.state, this.createdCallback);
  };

  insertText = str => {
    const textarea = document.querySelector("#text");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    this.setState({ description: before + str + after });
    textarea.focus();
  };

  insertSelection = e => {
    e.preventDefault();
    chrome.tabs.executeScript(
      {
        code: "window.getSelection().toString();"
      },
      selection => {
        if (selection) this.insertText(selection);
      }
    );
  };

  insertURL = e => {
    e.preventDefault();
    chrome.tabs.getSelected(null, tab => {
      this.insertText(tab.url);
    });
  };

  processFiles = files => {
    if (files) {
      const fileCount = files.length;
      const fileSpace = 5 - this.state.files.length;
      for (
        let i = 0;
        i < (fileCount < fileSpace ? fileCount : fileSpace);
        i++
      ) {
        if (files[i].kind === "file") {
          this.setState(state => state.files.push(files[i].getAsFile()));
        } else if (files[i] instanceof File) {
          this.setState(state => state.files.push(files[i]));
        }
      }
    }
  };

  dropHandler = ev => {
    ev.preventDefault();
    this.processFiles(ev.dataTransfer.items);
  };

  fileInputHandler = ev => {
    ev.preventDefault();
    this.processFiles(ev.target.files);
  };

  dragOverHandler = ev => {
    ev.preventDefault();
  };

  dataURLtoBlob = dataurl => {
    var arr = dataurl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  removeItem = itemId => {
    this.setState(state => state.files.splice(itemId, 1));
  };

  handleNameChange = ev => this.setState({ name: ev.target.value });
  handleDescriptionChange = ev =>
    this.setState({ description: ev.target.value });

  capture = ev => {
    ev.preventDefault();
    if (this.state.files.length < 5) {
      chrome.tabs.captureVisibleTab(dataURL => {
        const blob = this.dataURLtoBlob(dataURL);
        this.setState(state => state.files.push(blob));
      });
    }
  };

  createdCallback = (isOK, itemId) => {
    if (isOK === true) {
      const { isCard, id, boardId } = this.state;
      this.setState({
        itemCreated: {
          isOK: true,
          cardId: isCard ? itemId : id,
          boardId: boardId
        }
      });
    } else {
      this.setState({
        itemCreated: {
          isOK: false,
          errorMessage: isOK
        }
      });
    }
  };

  render() {
    const {
      files,
      name,
      description,
      isCard,
      boardId,
      warning,
      itemCreated
    } = this.state;

    return (
      <>
        {itemCreated ? (
          <ItemCreated data={itemCreated} />
        ) : (
          <form>
            {isCard && (
              <RSGInput
                type="text"
                placeholder="Name"
                value={name}
                onChange={this.handleNameChange}
              />
            )}
            <textarea
              id="text"
              placeholder={`${
                isCard ? "Description." : "Comment."
              } Markdown allowed.`}
              value={description}
              onChange={this.handleDescriptionChange}
            />
            <div style={{ textAlign: "center" }}>
              Drag and drop up to 5 files anywhere in this popup.
            </div>
            <div>
              <Button style={{ width: "44%" }} onClick={this.insertSelection}>
                Insert selection
              </Button>
              <Button style={{ width: "50%" }} onClick={this.insertURL}>
                Insert current URL
              </Button>
            </div>
            <div>
              <label id="choose_file">
                <input
                  type="file"
                  multiple="multiple"
                  style={{ display: "none" }}
                  onChange={this.fileInputHandler}
                />
                Choose file
              </label>
              <Button style={{ width: "60%" }} onClick={this.capture}>
                Capture screenshot
              </Button>
            </div>
            {files.length < 5 && (
              <label>
                <input
                  type="file"
                  multiple="multiple"
                  style={{ display: "none" }}
                  onChange={this.fileInputHandler}
                />
              </label>
            )}
            {files.length ? (
              <>
                <b>Attachments:</b>
                {files.map((f, i) => {
                  return (
                    <div style={{ marginLeft: 5 }}>
                      {f.name || "screenshot"}{" "}
                      <b
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          this.removeItem(i);
                        }}
                      >
                        x
                      </b>
                    </div>
                  );
                })}
              </>
            ) : (
              ""
            )}
            <div>
              {warning && <div style={{ marginLeft: 5 }}>{warning}</div>}
              <Button onClick={this.publish}>Publish</Button>
              <Link to={isCard ? "/boards/new" : `/boards/${boardId}/cards/`}>
                <Button>Back</Button>
              </Link>
              <Link to={`/`}>
                <Button>Home</Button>
              </Link>
            </div>
          </form>
        )}
      </>
    );
  }
}

export default CreateItem;
