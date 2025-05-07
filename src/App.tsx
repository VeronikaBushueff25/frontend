import React from 'react';
import { Container, Card } from 'react-bootstrap';
import ItemList from "./components/ItemList";

function App() {
    return (
        <Container className="my-4">
            <h1 className="text-center mb-4">Список элементов</h1>
            <Card className="shadow-sm">
                <ItemList />
            </Card>
        </Container>
    );
}

export default App;