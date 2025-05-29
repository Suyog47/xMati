import React, { useState } from "react";
import { Callout } from '@blueprintjs/core'

const BotForm = () => {
  const [activeTab, setActiveTab] = useState("amazonLex");
  const [botName, setBotName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [response, setResponse] = useState("");
  const [template, setTemplate] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);


  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setResponse(""); // Clear the response when switching tabs
  };

  const handleSubmitAmazonLex = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await fetch('https://www.app.xmati.ai/apis/lexbot', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          botName,
          apiUrl,
          template
        }),
      });


      if (result.status == "200") {
        const data = await result.json();
        setResponse(JSON.stringify(data, null, 2));

      } else {
        const data = await result.json();
        setResponse("Error: Unable to submit the form.");
        alert(data);
      }
    } catch (error) {
      console.error("Error:", error);
      setResponse("Error: Something went wrong.");
    }
    finally {
      setIsLoading(false); // Hide loader
    }
  };

  const handleSubmitTelegram = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // // Path to bot.config.json (Adjust path if needed)
    // const configPath = `../../../../../packages/bp/dist/data/bots/${window.BOT_ID}/bot.config.json`;
    // const absolutePath = path.resolve(__dirname, configPath);

    // console.log(__dirname, '');
    // console.log(absolutePath);

    // // Define the JSON content
    // const jsonData = {
    //   "messaging": {
    //     "channels": {
    //       "telegram": {
    //         "enabled": true,
    //         "botToken": "ghcghc"
    //       }
    //     }
    //   }
    // };

    // Convert the JSON object to a string
    // const jsonString = JSON.stringify(jsonData, null, 2);

    // try {
    //   if (vol.existsSync(__dirname, configPath)) {
    //     vol.writeFileSync(__dirname, configPath, jsonString);

    //     console.log('Telegram configuration updated successfully!');
    //   }
    //   else {
    //     console.log('file not found');
    //   }
    // } catch (error) {
    //   console.error('Error updating: ', error);
    // }

    try {
      const result = await fetch('https://www.app.xmati.ai/apis/telegram/setwebhook', {   // for localhost - http://localhost:8000/telegram/setwebhook
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          botToken: telegramToken,
          botId: window.BOT_ID
        }),
      });

      const data = await result.json();

      if (result.status == "200") {
        setResponse(JSON.stringify(data, null, 2));
      } else {
        setResponse("Error: Unable to submit the token.");
        alert(data);
      }
    } catch (error) {
      console.error("Error:", error);
      setResponse("Error: Something went wrong.");
    }
    finally {
      setIsLoading(false); // Hide loader
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px",
    margin: "5px 0",
    borderRadius: "5px",
    border: "1px solid #ccc",
  };

  const buttonStyle = {
    padding: "10px 20px",
    backgroundColor: "#007BFF",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: isLoading ? "not-allowed" : "pointer",
  }

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h3 className="step-one">Integration Dashboard</h3>
      <div style={{ display: "flex", marginBottom: "20px" }}>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: activeTab === "amazonLex" ? "#0056b3" : "#007BFF",
          }}
          onClick={() => handleTabChange("amazonLex")}
        >
          Amazon Lex
        </button>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: activeTab === "telegram" ? "#0056b3" : "#007BFF",
            marginLeft: "10px",
          }}
          onClick={() => handleTabChange("telegram")}
        >
          Telegram
        </button>
      </div>

      {activeTab === "amazonLex" && (
        <div>
          <h3>Create Bot for Amazon Lex</h3>
          <Callout className={{ margin: '10px 0 10px 0' }}>
            {
              'Upon successfully creating an Amazon Lex bot, you will receive a "botId" in the response. Please save this ID, as it is essential for interacting with the Amazon Lex node'
            }
          </Callout>
          <br />
          <form onSubmit={handleSubmitAmazonLex}>
            <div style={{ marginBottom: "10px" }}>
              <label>Bot Name</label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="Bot Name"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label>API URL</label>
              <input
                type="url"
                value={apiUrl}
                placeholder="API URL"
                onChange={(e) => setApiUrl(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label>Bot Template</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="" disabled>
                  Select Template
                </option>
                <option value="Book Dentist Appointment">
                  Book Dentist Appointment
                </option>
              </select>
            </div>
            <button
              type="submit"
              style={buttonStyle}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Submit"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "telegram" && (
        <div>
          <h3>Setup your bot with Telegram</h3>
          <Callout className={{ margin: '10px 0 10px 0' }}>
            {
              "Create your telegram bot first using telegram's BotFather bot. After creation, it will provide a bot token. You need to provide the token here."
            }
          </Callout>
          <br />
          <form onSubmit={handleSubmitTelegram}>
            <div style={{ marginBottom: "10px" }}>
              <label>Bot Token</label>
              <input
                type="text"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="Telegram Bot Token"
                required
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              style={buttonStyle}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Submit"}
            </button>
          </form>
        </div>
      )}

      {isLoading && (
        <div
          style={{
            marginTop: "10px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              border: "3px solid #ccc",
              borderTop: "3px solid #007BFF",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          ></div>
        </div>
      )}

      {response && (
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "5px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <strong>Response:</strong>
          <pre>{response}</pre>
        </div>
      )}
    </div>
  );
};

export default BotForm;

