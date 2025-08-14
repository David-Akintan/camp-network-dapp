import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CampProvider } from "@campnetwork/origin/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, polygon, optimism, arbitrum, basecampTestnet } from "wagmi/chains";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import '@rainbow-me/rainbowkit/styles.css';
import "./styles/index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./contexts/ThemeContext";


// ENV variables
const clientID = import.meta.env.VITE_ORIGIN_CLIENT_ID;
const originAPI = import.meta.env.VITE_ORIGIN_API;
const subgraphURL = import.meta.env.VITE_SUBGRAPH_URL;

// Query Client
const queryClient = new QueryClient();

// Apollo Client
const apollo = new ApolloClient({
  uri: subgraphURL,
  cache: new InMemoryCache(),
});

// Wagmi + RainbowKit Config
const config = getDefaultConfig({
  appName: "BlockTicket",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID, // You MUST set this
  chains: [mainnet, polygon, optimism, arbitrum, basecampTestnet],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [basecampTestnet.id]: http(),
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider>
          <CampProvider clientId={clientID}>
            <ApolloProvider client={apollo}>
              <ThemeProvider>
                <App />
              </ThemeProvider>
            </ApolloProvider>
          </CampProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </StrictMode>
);
